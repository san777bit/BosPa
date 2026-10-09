import pytest

from bospa.domain import antifraud as af
from bospa.domain.antifraud import Point
from bospa.domain.eta import DEFAULT_SPEED_KMH, eta_seconds
from bospa.domain.geo import Polyline, haversine
from bospa.domain.mapmatch import match
from bospa.domain.status import GREEN, RED, YELLOW, Checkin, compute_status, decay_weight

from .conftest import at

NOW = 1_800_000_000.0


# --- geo ------------------------------------------------------------------------

def test_haversine_one_degree_latitude():
    assert haversine(43.0, 76.9, 44.0, 76.9) == pytest.approx(111_195, rel=1e-3)


def test_project_and_point_at_roundtrip(direction):
    lat, lon = at(1234, east_m=12)
    p = direction.line.project(lat, lon)
    assert p.s == pytest.approx(1234, abs=2)
    assert p.offset == pytest.approx(12, abs=1)
    back = direction.line.point_at(p.s)
    assert haversine(*back, *at(1234)) < 2


def test_project_with_window_prefers_nearby_part():
    # Линия-петля: туда и обратно по одной улице с разносом 20 м
    line = Polyline([at(0), at(1000), at(1000, 20), at(0, 20)])
    lat, lon = at(500, 10)
    assert line.project(lat, lon, near_s=1500, window=300).s == pytest.approx(1520, abs=5)
    assert line.project(lat, lon, near_s=500, window=300).s == pytest.approx(500, abs=5)


# --- status ---------------------------------------------------------------------

def test_decay_halves_every_five_minutes():
    assert decay_weight(0) == 1
    assert decay_weight(300) == pytest.approx(0.5)
    assert decay_weight(900) == pytest.approx(0.125)


def test_status_levels_and_threshold():
    assert compute_status([Checkin(1, RED, 1.0, NOW)], NOW).level == RED
    mixed = [Checkin(1, GREEN, 1.0, NOW), Checkin(2, RED, 1.0, NOW)]
    assert compute_status(mixed, NOW).level == YELLOW
    assert compute_status([], NOW).level is None


def test_fresh_checkin_outweighs_old():
    st = compute_status([Checkin(1, GREEN, 1.0, NOW - 600), Checkin(2, RED, 1.0, NOW)], NOW)
    assert st.level == RED


def test_checkins_outside_window_ignored():
    st = compute_status([Checkin(1, RED, 1.0, NOW - 16 * 60)], NOW)
    assert not st.has_data


def test_upstream_only_and_limited():
    # отметка после остановки (k < 0) и слишком далёкая (k > 3) не учитываются
    st = compute_status([Checkin(1, RED, 1.0, NOW, stop_idx=6), Checkin(2, RED, 1.0, NOW, stop_idx=1)], NOW, 5)
    assert not st.has_data
    st = compute_status([Checkin(1, RED, 1.0, NOW, stop_idx=3)], NOW, 5)
    assert st.level == RED and st.confidence == "low"


def test_vehicle_status_ignores_distance():
    st = compute_status([Checkin(1, RED, 1.0, NOW, stop_idx=0)], NOW, 9, spatial=False)
    assert st.level == RED and st.confidence == "ok"


def test_untrusted_checkin_alone_is_not_enough():
    assert not compute_status([Checkin(1, RED, 0.0, NOW)], NOW).has_data


# --- antifraud ------------------------------------------------------------------

def test_location_near_stop_is_trusted(direction):
    stop = direction.stops[2]
    lat, lon = at(stop.s + 100)
    assert af.check_location(Point(lat, lon, NOW), NOW, direction, stop, in_ride=False) == (1.0, None)


def test_location_missing_or_old_or_far(direction):
    stop = direction.stops[2]
    assert af.check_location(None, NOW, direction, stop, False)[1] == af.NO_LOCATION
    lat, lon = at(stop.s)
    assert af.check_location(Point(lat, lon, NOW - 400), NOW, direction, stop, False)[1] == af.NO_LOCATION
    lat, lon = at(stop.s + 2000)
    assert af.check_location(Point(lat, lon, NOW), NOW, direction, stop, False)[1] == af.FAR_FROM_STOP
    # пассажир в салоне — достаточно быть у линии маршрута
    assert af.check_location(Point(lat, lon, NOW), NOW, direction, stop, True)[1] is None


def test_speed_check():
    a = Point(*at(0), NOW)
    assert af.check_speed(a, Point(*at(1000), NOW + 120)) is None          # 30 км/ч
    assert af.check_speed(a, Point(*at(5000), NOW + 60)) == af.TOO_FAST    # 300 км/ч
    assert af.check_speed(None, a) is None


# --- mapmatch -------------------------------------------------------------------

def test_pedestrian_standing_is_not_a_vehicle(direction):
    t = None
    for i in range(5):
        t = match(direction, *at(1000, 5), NOW + i * 10, t)
    assert not t.valid


def test_moving_bus_becomes_valid(direction):
    t = match(direction, *at(1000), NOW, None)
    t = match(direction, *at(1100), NOW + 10, t)   # 36 км/ч
    assert t.valid and t.speed_kmh == pytest.approx(36, abs=1)
    # стоянка на остановке не делает трек невалидным
    t = match(direction, *at(1098), NOW + 40, t)
    assert t.valid and t.s == pytest.approx(1100, abs=1)


def test_off_route_three_times_invalidates(direction):
    t = match(direction, *at(1000), NOW, None)
    t = match(direction, *at(1100), NOW + 10, t)
    for i in range(3):
        t = match(direction, *at(1200, 200), NOW + 20 + i * 10, t)
    assert not t.valid


def test_backtrack_is_ignored(direction):
    t = match(direction, *at(1000), NOW, None)
    t = match(direction, *at(1100), NOW + 10, t)
    t = match(direction, *at(900), NOW + 20, t)
    assert t.s == pytest.approx(1100, abs=1) and t.misses == 1


# --- eta ------------------------------------------------------------------------

def test_eta_default_speed(direction):
    eta = eta_seconds(direction, 0, 1000, {})
    assert eta == pytest.approx(1000 / (DEFAULT_SPEED_KMH / 3.6))


def test_eta_uses_segment_speeds(direction):
    # отрезок 0 (st00→st01) едем 36 км/ч, отрезок 1 — по умолчанию
    eta = eta_seconds(direction, 0, 1000, {0: 36.0})
    assert eta == pytest.approx(500 / 10 + 500 / (DEFAULT_SPEED_KMH / 3.6))


def test_eta_vehicle_already_passed(direction):
    assert eta_seconds(direction, 1500, 1000, {}) is None
    assert eta_seconds(direction, 1010, 1000, {}) == 0.0
