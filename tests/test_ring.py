"""Кольцевые маршруты: переход через конечную, ETA через конечную, порядок остановок."""

from pathlib import Path

import pytest

from bospa.domain.geo import Polyline
from bospa.domain.mapmatch import match
from bospa.domain.routes import Direction, Network, Route, Stop
from bospa.services.status import StatusService

from .conftest import at

NOW = 1_800_000_000.0
SIDE = 1000.0


def ring_direction() -> Direction:
    # Квадрат 1×1 км: север → восток → юг → запад, обратно в начало
    corners = [at(0, 0), at(SIDE, 0), at(SIDE, SIDE), at(0, SIDE), at(0, 0)]
    line = Polyline(corners)
    stops = [Stop(f"k{i}", f"Угол {i}", *line.point_at(i * SIDE), i, i * SIDE) for i in range(4)]
    return Direction("ring", "a", "Кольцевой", line, stops, ring=True)


def test_bus_continues_to_new_lap():
    d = ring_direction()
    t = match(d, *d.line.point_at(3850), NOW, None)
    t = match(d, *d.line.point_at(3950), NOW + 10, t)
    assert t.valid
    t = match(d, *d.line.point_at(50), NOW + 20, t)      # проехал конечную
    assert t.valid and t.misses == 0 and t.s == pytest.approx(50, abs=2)
    assert t.speed_kmh == pytest.approx(36, abs=2)


def test_ring_gap_goes_through_terminal():
    d = ring_direction()
    assert d.gap(d.line.length - 10, 10) == pytest.approx(20, abs=1)
    assert d.gap(1000, 3000) == pytest.approx(2000, abs=1)


async def test_ring_eta_through_terminal(repo):
    d = ring_direction()
    await repo.set_vehicles("ring", "a", [{"id": "crowd:x", "s": 3900.0, "stale": False}])
    views = await StatusService(Network([Route("ring", "К", "К", "bus", True, {"a": d})]), repo) \
        .direction_views(d, NOW)
    k1 = next(v for v in views if v.stop.id == "k1")
    assert k1.vehicle["id"] == "crowd:x"
    assert k1.eta_s == pytest.approx(1100 / (18 / 3.6), rel=0.01)


def test_loader_keeps_stop_order_on_repeated_street(tmp_path: Path):
    # Маршрут едет на север, потом возвращается по той же улице: остановка «Обратно»
    # физически совпадает с «Туда», но по порядку она вторая.
    yaml_text = f"""
routes:
  - id: x
    title: X
    directions:
      - id: a
        title: туда-обратно
        line: [[{at(0)[0]}, {at(0)[1]}], [{at(2000)[0]}, {at(2000)[1]}], [{at(2000, 15)[0]}, {at(2000, 15)[1]}], [{at(0, 15)[0]}, {at(0, 15)[1]}]]
        stops:
          - {{id: s1, name: Туда, lat: {at(500)[0]}, lon: {at(500)[1]}}}
          - {{id: s2, name: Конечная, lat: {at(2000)[0]}, lon: {at(2000)[1]}}}
          - {{id: s3, name: Обратно, lat: {at(500, 15)[0]}, lon: {at(500, 15)[1]}}}
"""
    p = tmp_path / "routes.yaml"
    p.write_text(yaml_text, encoding="utf-8")
    d = Network.load(p).direction("x", "a")
    assert [s.id for s in d.stops] == ["s1", "s2", "s3"]
    assert d.stops[2].s == pytest.approx(3515, abs=5)


def test_real_38a_data_loads_in_order():
    root = Path(__file__).resolve().parent.parent
    d = Network.load(root / "data" / "routes.yaml").direction("b38a", "a")
    assert d.ring and len(d.stops) == 65
    assert all(a.s <= b.s for a, b in zip(d.stops, d.stops[1:]))
    assert all(d.line.project(s.lat, s.lon).offset < 80 for s in d.stops)
