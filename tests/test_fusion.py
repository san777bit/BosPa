import itertools

from bospa.domain.fusion import CrowdTrack, OfficialTrack, RideState, fuse

NOW = 1_800_000_000.0
LENGTH = 5000.0


def ids():
    counter = itertools.count(1)
    return lambda: f"n{next(counter)}"


def run(steps, official_available=True):
    """steps — список (now, officials, crowd). Возвращает последние борта и состояния поездок."""
    rides: dict[int, RideState] = {}
    new_id = ids()
    vehicles = []
    for now, officials, crowd in steps:
        vehicles, rides = fuse(now, LENGTH, officials, crowd, rides, official_available, new_id)
    return vehicles, rides


def test_passenger_attaches_after_three_updates():
    steps = []
    for i in range(3):
        t = NOW + i * 10
        steps.append((t, [OfficialTrack("123", 1000 + i * 100, 36, t)], [CrowdTrack(7, 1010 + i * 100, 36, t, True)]))
    _, rides = run(steps[:2])
    assert rides[7].vehicle_id is None
    vehicles, rides = run(steps)
    assert rides[7].vehicle_id == "off:123"
    assert vehicles[0].riders == [7]


def test_no_attach_when_far_or_speed_differs():
    steps = [(NOW + i * 10, [OfficialTrack("123", 1000, 36, NOW + i * 10)],
              [CrowdTrack(7, 1400, 36, NOW + i * 10, True)]) for i in range(4)]
    assert run(steps)[1][7].vehicle_id is None
    steps = [(NOW + i * 10, [OfficialTrack("123", 1000, 36, NOW + i * 10)],
              [CrowdTrack(7, 1000, 5, NOW + i * 10, True)]) for i in range(4)]
    assert run(steps)[1][7].vehicle_id is None


def test_position_fresh_official():
    v, _ = run([(NOW, [OfficialTrack("1", 1000, 36, NOW - 5)], [])])
    assert v[0].source == "official" and not v[0].stale and v[0].s == 1000


def test_position_falls_back_to_attached_passenger():
    rides = {7: RideState(vehicle_id="off:1", last_ts=NOW - 50)}
    v, _ = fuse(NOW, LENGTH, [OfficialTrack("1", 1000, 36, NOW - 60)],
                [CrowdTrack(7, 1500, 36, NOW - 2, True)], rides, True)
    assert v[0].source == "fused" and v[0].s == 1500 and not v[0].stale


def test_position_extrapolated_when_stale_and_dropped_when_too_old():
    v, _ = run([(NOW, [OfficialTrack("1", 1000, 36, NOW - 60)], [])])
    assert v[0].stale and v[0].s == 1000 + 10 * 60
    v, _ = run([(NOW, [OfficialTrack("1", 1000, 36, NOW - 200)], [])])
    assert v == []


def test_detach_after_three_misses():
    rides = {7: RideState(vehicle_id="off:1", last_ts=NOW)}
    for i in range(1, 4):
        t = NOW + i * 10
        _, rides = fuse(t, LENGTH, [OfficialTrack("1", 1000, 36, t)], [CrowdTrack(7, 3000, 36, t, True)], rides, True)
    assert rides[7].vehicle_id is None


def test_loose_passenger_hidden_when_official_available():
    v, rides = run([(NOW, [OfficialTrack("1", 4000, 36, NOW)], [CrowdTrack(7, 1000, 30, NOW, True)])])
    assert [x.id for x in v] == ["off:1"]


def test_crowd_vehicles_without_official():
    crowd = [CrowdTrack(1, 1000, 30, NOW, True), CrowdTrack(2, 1050, 32, NOW, True),
             CrowdTrack(3, 3000, 30, NOW, True), CrowdTrack(4, 2000, 30, NOW, False)]
    v, rides = run([(NOW, [], crowd)], official_available=False)
    assert len(v) == 2
    together = next(x for x in v if 1 in x.riders)
    assert sorted(together.riders) == [1, 2] and together.s == 1025 and together.source == "crowd"
    assert rides[1].vehicle_id == rides[2].vehicle_id != rides[3].vehicle_id


def test_crowd_vehicle_id_is_stable():
    steps = [(NOW + i * 10, [], [CrowdTrack(1, 1000 + i * 100, 36, NOW + i * 10, True)]) for i in range(3)]
    rides: dict[int, RideState] = {}
    seen = set()
    new_id = ids()
    for now, off, crowd in steps:
        v, rides = fuse(now, LENGTH, off, crowd, rides, False, new_id)
        seen.add(v[0].id)
    assert len(seen) == 1
