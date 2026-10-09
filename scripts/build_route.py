"""Сборка маршрута по списку остановок: data/specs/<route>.yaml → data/routes.yaml.

    uv run python scripts/build_route.py data/specs/b38a.yaml

1. Остановки ищутся по имени среди всех остановок Алматы в OpenStreetMap.
   Из одноимённых (у «Рыскулова» их почти 20) выбирается цепочка с минимальным
   суммарным расстоянием, а из пары по разные стороны дороги — та, что справа по ходу.
2. Линия по дорогам строится через OSRM (router.project-osrm.org, данные OSM)
   с подъездом к остановкам со стороны тротуара.
3. Остановки approx: true ставятся посередине между соседями на линии.

Маршрут в data/routes.yaml заменяется целиком, остальные остаются как были.
"""

import json
import math
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from bospa.domain.geo import Polyline, haversine  # noqa: E402
from scripts.import_osm import overpass  # noqa: E402

ALMATY_BBOX = "43.13,76.70,43.42,77.15"
OSRM_URL = "https://router.project-osrm.org/route/v1/driving/"
USER_AGENT = "bospa-route-build/0.1"
CACHE = ROOT / "data" / ".cache"
SIDE_PAIR_M = 80.0
SAME_POINT_M = 30.0
SAME_POINT_PENALTY = 100_000.0
DETOUR_WARN = 2.5


def norm(s: str) -> str:
    s = s.lower().replace("ё", "е")
    s = re.sub(r"[«»\"']", "", s)
    s = re.sub(r"\b(улица|ул|проспект|пр|микрорайон|мкр|мкрн|бульвар|тц|трц|трк|жк|река|им)\b\.?", " ", s)
    s = re.sub(r"[^\w\s-]", " ", s)
    return " ".join(s.split())


def load_osm_stops() -> dict[str, list[tuple[float, float]]]:
    CACHE.mkdir(exist_ok=True)
    cache = CACHE / "osm_stops.json"
    if cache.exists():
        elements = json.loads(cache.read_text())
    else:
        q = (f'[out:json][timeout:180];(node["highway"="bus_stop"]["name"]({ALMATY_BBOX});'
             f'node["public_transport"="platform"]["name"]({ALMATY_BBOX}););out;')
        elements = overpass(q)["elements"]
        cache.write_text(json.dumps(elements))
    index: dict[str, list[tuple[float, float]]] = {}
    for e in elements:
        for k in ("name", "name:ru"):
            if name := e["tags"].get(k):
                index.setdefault(norm(name), []).append((e["lat"], e["lon"]))
    return index


def _step(a: tuple[float, float], b: tuple[float, float]) -> float:
    d = haversine(*a, *b)
    # Две соседние остановки не могут быть одной точкой («Проспект Абая» и «Абая»)
    return d + SAME_POINT_PENALTY if d < SAME_POINT_M else d


def choose_chain(cands: list[list[tuple[float, float]]]) -> list[tuple[float, float]]:
    """Витерби: по одному кандидату на остановку с минимальной суммой расстояний."""
    cost = [0.0] * len(cands[0])
    back: list[list[int]] = []
    for i in range(1, len(cands)):
        new_cost, ptr = [], []
        for c in cands[i]:
            j = min(range(len(cands[i - 1])), key=lambda j: cost[j] + _step(cands[i - 1][j], c))
            new_cost.append(cost[j] + _step(cands[i - 1][j], c))
            ptr.append(j)
        cost, back = new_cost, back + [ptr]
    k = min(range(len(cost)), key=lambda k: cost[k])
    chain = [k]
    for ptr in reversed(back):
        k = ptr[k]
        chain.append(k)
    chain.reverse()
    return [cands[i][k] for i, k in enumerate(chain)]


def right_side(chain, cands):
    """Из одноимённых остановок рядом с выбранной берём ту, что справа по ходу движения."""
    out = list(chain)
    for i in range(1, len(chain) - 1):
        (y0, x0), (y1, x1) = chain[i - 1], chain[i + 1]
        dx, dy = (x1 - x0) * math.cos(math.radians(y0)), y1 - y0
        pair = [c for c in cands[i] if haversine(*c, *chain[i]) <= SIDE_PAIR_M]

        def right(c):  # отрицательное векторное произведение — точка справа
            cx, cy = (c[1] - x0) * math.cos(math.radians(y0)), c[0] - y0
            return dx * cy - dy * cx
        out[i] = min(pair, key=right)
    return out


def osrm_legs(points: list[tuple[float, float]], approach: str) -> list[tuple[list[tuple[float, float]], float]]:
    """Геометрия и длина каждого участка между соседними точками."""
    coords = ";".join(f"{lon:.6f},{lat:.6f}" for lat, lon in points)
    params = {"overview": "false", "steps": "true", "geometries": "geojson",
              "approaches": ";".join([approach] * len(points))}
    req = urllib.request.Request(OSRM_URL + coords + "?" + urllib.parse.urlencode(params),
                                 headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.load(resp)
    except urllib.error.HTTPError as e:
        data = json.load(e)
    if data.get("code") != "Ok":
        raise RuntimeError(f"OSRM ({approach}): {data.get('code')} {data.get('message')}")
    legs = []
    for leg in data["routes"][0]["legs"]:
        pts: list[tuple[float, float]] = []
        for step in leg["steps"]:
            for lon, lat in step["geometry"]["coordinates"]:
                if not pts or pts[-1] != (lat, lon):
                    pts.append((lat, lon))
        legs.append((pts, leg["distance"]))
    return legs


def build_line(points: list[tuple[float, float]], names: list[str]) -> tuple[list[tuple[float, float]], list[str]]:
    """Линия по дорогам. Участки с подозрительным крюком перестраиваются, а если не вышло — прямой отрезок."""
    # Подъезд со стороны тротуара даёт правильную сторону дороги, но если остановка
    # в OSM только на противоположной стороне, OSRM делает петлю вокруг квартала.
    # Поэтому на каждом участке берём более короткий из двух вариантов.
    free = osrm_legs(points, "unrestricted")
    try:
        curb = osrm_legs(points, "curb")
    except RuntimeError as e:
        # К какой-то точке нельзя подъехать со стороны тротуара (тупик, конечная)
        print(f"  {e} — строю без подъезда со стороны тротуара", file=sys.stderr)
        curb = free
    line: list[tuple[float, float]] = []
    straightened = []
    for i, ((pts_c, dist_c), (pts_f, dist_f)) in enumerate(zip(curb, free)):
        pts, dist = (pts_c, dist_c) if dist_c <= dist_f * 1.05 else (pts_f, dist_f)
        a, b = points[i], points[i + 1]
        straight = haversine(*a, *b)
        if straight > 50 and dist / straight > DETOUR_WARN:
            pts = [a, b]
            straightened.append(f"{names[i]} → {names[(i + 1) % len(names)]} ({straight:.0f} м)")
        line.extend(pts if not line else pts[1:])
    return line, straightened


def main() -> None:
    spec = yaml.safe_load(Path(sys.argv[1]).read_text(encoding="utf-8"))
    out_path = ROOT / "data" / "routes.yaml"
    index = load_osm_stops()

    directions_out = []
    by_id = {d["id"]: d for d in spec["directions"]}
    for d in spec["directions"]:
        # reverse_of: те же остановки в обратном порядке; стороны дороги и линия подбираются заново
        src = by_id[d["reverse_of"]]["stops"][::-1] if "reverse_of" in d else d["stops"]
        stops = [dict(s) if isinstance(s, dict) else {"name": s} for s in src]
        known = [s for s in stops if not s.get("approx")]
        cands = []
        for s in known:
            found = index.get(norm(s.get("osm", s["name"])))
            if not found:
                raise SystemExit(f"в OSM нет остановки «{s.get('osm', s['name'])}» — добавьте osm: или approx: true")
            cands.append(found)
        chain = right_side(choose_chain(cands), cands)
        for s, pt in zip(known, chain):
            s["lat"], s["lon"] = pt

        waypoints = chain + ([chain[0]] if d.get("ring") else [])
        line, straightened = build_line(waypoints, [s["name"] for s in known])
        for leg in straightened:
            print(f"  ⚠ прямой отрезок вместо крюка по дорогам: {leg}", file=sys.stderr)

        poly = Polyline(line)
        # s известных остановок — по порядку, чтобы повторные проезды по одной улице не путались
        prev_s = 0.0
        for s in known:
            p = poly.project(s["lat"], s["lon"], near_s=prev_s + 2500, window=2500)
            s["s"] = prev_s = p.s
        # approx-остановки — посередине между соседями
        i = 0
        while i < len(stops):
            if not stops[i].get("approx"):
                i += 1
                continue
            j = i
            while j < len(stops) and stops[j].get("approx"):
                j += 1
            lo = stops[i - 1]["s"] if i > 0 else 0.0
            hi = stops[j]["s"] if j < len(stops) else poly.length
            for k in range(i, j):
                s_k = lo + (hi - lo) * (k - i + 1) / (j - i + 1)
                stops[k]["lat"], stops[k]["lon"] = poly.point_at(s_k)
                stops[k]["s"] = s_k
            i = j

        print(f"{spec['id']}/{d['id']}: {len(stops)} остановок ({len(stops) - len(known)} приблизительно), "
              f"{poly.length / 1000:.1f} км", file=sys.stderr)
        directions_out.append({
            "id": d["id"],
            "title": d["title"],
            **({"ring": True} if d.get("ring") else {}),
            "stops": [
                {"id": f"{spec['id']}{d['id']}{n:02d}", "name": s["name"],
                 "lat": round(s["lat"], 6), "lon": round(s["lon"], 6),
                 **({"approx": True} if s.get("approx") else {})}
                for n, s in enumerate(stops, 1)
            ],
            "line": [[round(lat, 6), round(lon, 6)] for lat, lon in line],
        })

    route = {"id": spec["id"], "title": spec["title"], "short": spec["short"], "kind": spec["kind"],
             "verified": False, "source": "2ГИС (порядок остановок), OpenStreetMap (координаты), OSRM (линия)",
             "directions": directions_out}

    text = out_path.read_text(encoding="utf-8")
    header = "".join(line for line in text.splitlines(keepends=True) if line.startswith("#"))
    data = yaml.safe_load(text)
    data["routes"] = [route if r["id"] == spec["id"] else r for r in data["routes"]]
    if spec["id"] not in {r["id"] for r in data["routes"]}:
        data["routes"].append(route)
    body = yaml.safe_dump(data, allow_unicode=True, sort_keys=False, default_flow_style=None, width=200)
    out_path.write_text(header + body, encoding="utf-8")
    print(f"записано: {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
