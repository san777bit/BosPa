"""Черновик data/routes.yaml из OpenStreetMap (© участники OpenStreetMap, ODbL).

    uv run python scripts/import_osm.py [--sources data/osm_sources.yaml] [--out data/routes.yaml]

Результат помечается verified: false. Его нужно проверить на месте: в OSM по
маршрутам Алматы не хватает остановок, а обратные направления часто не размечены.
"""

import argparse
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from bospa.domain.geo import Polyline, haversine  # noqa: E402

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
USER_AGENT = "bospa-route-import/0.1"
JOIN_TOLERANCE_M = 15.0
STOP_DEDUP_M = 50.0
STOP_MAX_OFFSET_M = 60.0
SKIP_WAY_ROLES = {"backward", "stop", "platform"}


def overpass(query: str, retries: int = 3) -> dict:
    data = urllib.parse.urlencode({"data": query}).encode()
    for attempt in range(retries):
        req = urllib.request.Request(OVERPASS_URL, data=data, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                return json.load(resp)
        except Exception as e:
            print(f"overpass attempt {attempt + 1} failed: {e}", file=sys.stderr)
            time.sleep(10 * (attempt + 1))
    raise SystemExit("Overpass недоступен, попробуйте позже")


def chain_ways(ways: list[list[tuple[float, float]]]) -> tuple[list[tuple[float, float]], int]:
    """Склеивает ways в одну линию, разворачивая их по необходимости. Возвращает линию и число разрывов."""
    line: list[tuple[float, float]] = []
    gaps = 0
    for pts in ways:
        if len(pts) < 2:
            continue
        if not line:
            line = list(pts)
            continue
        end = line[-1]
        d_fwd = haversine(*end, *pts[0])
        d_rev = haversine(*end, *pts[-1])
        if min(d_fwd, d_rev) > JOIN_TOLERANCE_M:
            # Возможно, первый way был развёрнут неправильно
            d_head_fwd = haversine(*line[0], *pts[0])
            d_head_rev = haversine(*line[0], *pts[-1])
            if min(d_head_fwd, d_head_rev) < min(d_fwd, d_rev):
                line.reverse()
                end = line[-1]
                d_fwd = haversine(*end, *pts[0])
                d_rev = haversine(*end, *pts[-1])
        seg = pts if d_fwd <= d_rev else pts[::-1]
        if min(d_fwd, d_rev) > JOIN_TOLERANCE_M:
            gaps += 1
            line.extend(seg)
        else:
            line.extend(seg[1:])
    return line, gaps


def collect(elements: list[dict], rel_ids: list[int]) -> tuple[list[tuple[float, float]], list[dict], int]:
    rels = {e["id"]: e for e in elements if e["type"] == "relation"}
    tags = {e["id"]: e.get("tags", {}) for e in elements if e["type"] == "node"}
    ways, stop_nodes = [], []
    for rid in rel_ids:
        for m in rels[rid]["members"]:
            if m["type"] == "way" and m["role"] not in SKIP_WAY_ROLES and m.get("geometry"):
                ways.append([(p["lat"], p["lon"]) for p in m["geometry"]])
            elif m["type"] == "node":
                t = tags.get(m["ref"], {})
                name = t.get("name:ru") or t.get("name")
                is_stop = (t.get("public_transport") in {"platform", "stop_position"}
                           or t.get("highway") == "bus_stop" or "stop" in m["role"] or "platform" in m["role"])
                if name and is_stop:
                    stop_nodes.append({"name": name, "lat": m["lat"], "lon": m["lon"]})
    line, gaps = chain_ways(ways)
    return line, stop_nodes, gaps


def place_stops(line: Polyline, nodes: list[dict]) -> list[dict]:
    placed = []
    for n in nodes:
        p = line.project(n["lat"], n["lon"])
        if p.offset > STOP_MAX_OFFSET_M:
            print(f"  пропуск «{n['name']}»: {p.offset:.0f} м от линии", file=sys.stderr)
            continue
        placed.append({**n, "s": p.s})
    placed.sort(key=lambda x: x["s"])
    out: list[dict] = []
    for st in placed:
        # Платформа и stop_position одной остановки — одна точка
        if out and (st["name"] == out[-1]["name"] or haversine(st["lat"], st["lon"], out[-1]["lat"], out[-1]["lon"]) < STOP_DEDUP_M):
            continue
        out.append(st)
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sources", default="data/osm_sources.yaml")
    ap.add_argument("--out", default="data/routes.yaml")
    args = ap.parse_args()

    sources = yaml.safe_load(Path(args.sources).read_text(encoding="utf-8"))["routes"]
    rel_ids = sorted({rid for r in sources for d in r["directions"] for rid in d.get("relations", [])})
    ids = ",".join(map(str, rel_ids))
    data = overpass(f"[out:json][timeout:120];rel(id:{ids})->.r;.r out geom;node(r.r);out tags;")

    routes_out = []
    for r in sources:
        dirs: dict[str, dict] = {}
        for d in r["directions"]:
            if "relations" in d:
                line, nodes, gaps = collect(data["elements"], d["relations"])
                if len(line) < 2:
                    raise SystemExit(f"{r['id']}/{d['id']}: пустая геометрия")
                stops = place_stops(Polyline(line), nodes)
                print(f"{r['id']}/{d['id']}: {len(line)} точек, {Polyline(line).length / 1000:.1f} км, "
                      f"{len(stops)} остановок, разрывов: {gaps}", file=sys.stderr)
            else:
                src = dirs[d["reverse_of"]]
                line = src["line"][::-1]
                length = Polyline(line).length
                stops = [{**s, "s": length - s["s"]} for s in reversed(src["stops"])]
            title = f"→ {stops[-1]['name']}" if stops else d["id"]
            dirs[d["id"]] = {"line": line, "stops": stops, "title": title}

        routes_out.append({
            "id": r["id"], "title": r["title"], "short": r["short"], "kind": r["kind"], "verified": False,
            "directions": [
                {
                    "id": did,
                    "title": dd["title"],
                    "stops": [{"id": f"{r['id']}{did}{i:02d}", "name": s["name"],
                               "lat": round(s["lat"], 6), "lon": round(s["lon"], 6)}
                              for i, s in enumerate(dd["stops"], 1)],
                    "line": [[round(lat, 6), round(lon, 6)] for lat, lon in dd["line"]],
                }
                for did, dd in dirs.items()
            ],
        })

    header = ("# Сгенерировано scripts/import_osm.py и scripts/build_route.py "
              "(© участники OpenStreetMap, ODbL).\n"
              "# verified: false — данные нужно проверить на месте.\n")
    # Маршруты, собранные другими скриптами, не трогаем
    out = Path(args.out)
    existing = yaml.safe_load(out.read_text(encoding="utf-8"))["routes"] if out.exists() else []
    ours = {r["id"] for r in routes_out}
    merged = [r for r in existing if r["id"] not in ours] + routes_out
    body = yaml.safe_dump({"routes": merged}, allow_unicode=True, sort_keys=False, default_flow_style=None,
                          width=200)
    Path(args.out).write_text(header + body, encoding="utf-8")
    print(f"записано: {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
