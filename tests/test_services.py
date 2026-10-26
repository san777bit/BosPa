import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

import httpx
import pytest

from bospa.api.app import create_app
from bospa.api.auth import verify_init_data
from bospa.config import Settings
from bospa.domain import antifraud as af
from bospa.domain.antifraud import Point
from bospa.domain.status import RED
from bospa.infra.models import User
from bospa.services.checkins import CheckinService
from bospa.services.fusion_loop import FusionRunner
from bospa.services.points import get_or_create_user
from bospa.services.rides import RideService
from bospa.services.status import StatusService
from bospa.sources.official import NullSource, Observation

from .conftest import at

NOW = 1_800_000_000.0
TOKEN = "123:abc"


async def _checkin(network, repo, sessionmaker, uid=1, stop="st02", now=NOW, level=RED):
    return await CheckinService(network, repo, sessionmaker).report(uid, "r1", "a", stop, level, now)


# --- чекины ---------------------------------------------------------------------

async def test_checkin_with_location_awards_points(network, repo, sessionmaker):
    await repo.set_location(1, Point(*at(1000), NOW))
    res = await _checkin(network, repo, sessionmaker)
    assert res.accepted and res.rewarded and res.points == 10 and res.balance == 10


async def test_checkin_cooldown(network, repo, sessionmaker):
    await repo.set_location(1, Point(*at(1000), NOW))
    await _checkin(network, repo, sessionmaker)
    res = await _checkin(network, repo, sessionmaker, now=NOW + 60)
    assert not res.accepted


async def test_checkin_without_location_counts_but_no_points(network, repo, sessionmaker):
    res = await _checkin(network, repo, sessionmaker)
    assert res.accepted and not res.rewarded and res.reasons == [af.NO_LOCATION]
    cks = await repo.get_checkins("r1", "a", [("st02", 2)], NOW)
    assert cks["st02"][0].trust == 0.5


async def test_hourly_limit(network, repo, sessionmaker):
    rewarded = 0
    for i in range(8):
        stop = f"st{i:02d}"
        await repo.set_location(1, Point(*at(i * 500), NOW + i))
        await repo.r.delete("lastck:1")  # проверяем только лимит, не скорость
        res = await _checkin(network, repo, sessionmaker, stop=stop, now=NOW + i)
        rewarded += res.rewarded
    assert rewarded == af.HOURLY_REWARD_LIMIT


async def test_referral_bonus_after_first_valid_checkin(network, repo, sessionmaker):
    async with sessionmaker() as s, s.begin():
        await get_or_create_user(s, 100)
        await get_or_create_user(s, 1, referrer_id=100)
    await _checkin(network, repo, sessionmaker)  # без геолокации — бонуса нет
    async with sessionmaker() as s:
        assert (await s.get(User, 100)).balance == 0
    await repo.set_location(1, Point(*at(1500), NOW + 700))
    await _checkin(network, repo, sessionmaker, stop="st03", now=NOW + 700)
    await repo.set_location(1, Point(*at(2000), NOW + 1400))
    await _checkin(network, repo, sessionmaker, stop="st04", now=NOW + 1400)
    async with sessionmaker() as s:
        assert (await s.get(User, 100)).balance == 50  # только один раз


# --- поездки и слияние ------------------------------------------------------------

class FakeOfficial:
    name = "fake"

    def __init__(self):
        self.obs = []

    async def fetch(self):
        return self.obs


async def test_ride_attaches_to_official_and_checkin_goes_to_vehicle(network, repo, sessionmaker):
    official = FakeOfficial()
    runner = FusionRunner(network, repo, official, sessionmaker)
    rides = RideService(network, repo, sessionmaker)
    await rides.select(1, "r1", "a")

    for i in range(5):
        t = NOW + i * 10
        s = 1000 + i * 100
        official.obs = [Observation("official", "r1", "a", *at(s), t, vehicle_ext_id="555")]
        await rides.on_live_location(1, *at(s + 20), t, started=(i == 0))
        await runner.tick(t)

    ride = await repo.get_ride(1)
    assert ride.vehicle_id == "off:555"
    vehicles = await repo.get_vehicles("r1", "a")
    assert vehicles[0]["riders"] == 1 and vehicles[0]["source"] == "official"

    res = await _checkin(network, repo, sessionmaker, stop="st03", now=NOW + 45)
    assert res.vehicle_id == "off:555" and res.rewarded

    view = await StatusService(network, repo).stop_view(network.direction("r1", "a"), "st08", NOW + 45)
    assert view.by_vehicle and view.status.level == RED
    assert view.vehicle["id"] == "off:555" and view.eta_s > 0


async def test_ride_award_requires_official_vehicle_when_available(network, repo, sessionmaker):
    official = FakeOfficial()
    runner = FusionRunner(network, repo, official, sessionmaker)
    rides = RideService(network, repo, sessionmaker)
    await rides.select(1, "r1", "a")
    official.obs = [Observation("official", "r1", "a", *at(4000), NOW, vehicle_ext_id="9")]
    await runner.tick(NOW)
    await rides.on_live_location(1, *at(1000), NOW, started=True)
    await rides.on_live_location(1, *at(1100), NOW + 10, started=False)
    upd = await rides.on_live_location(1, *at(1300), NOW + 301, started=False)
    assert upd.track.valid and upd.awarded == 0


async def test_crowd_only_vehicle_and_ride_points(network, repo, sessionmaker):
    runner = FusionRunner(network, repo, NullSource(), sessionmaker)
    rides = RideService(network, repo, sessionmaker)
    await rides.select(1, "r1", "a")
    await rides.on_live_location(1, *at(1000), NOW, started=True)
    await rides.on_live_location(1, *at(1100), NOW + 10, started=False)
    await runner.tick(NOW + 11)
    vehicles = await repo.get_vehicles("r1", "a")
    assert len(vehicles) == 1 and vehicles[0]["source"] == "crowd"
    upd = await rides.on_live_location(1, *at(1300), NOW + 310, started=False)
    assert upd.awarded == 5 and upd.balance == 5


async def test_fusion_learns_segment_speed(network, repo, sessionmaker):
    official = FakeOfficial()
    runner = FusionRunner(network, repo, official, sessionmaker)
    for i in range(3):
        t = NOW + i * 10
        official.obs = [Observation("official", "r1", "a", *at(600 + i * 100), t, vehicle_ext_id="1")]
        await runner.tick(t)
    from bospa.domain.eta import time_bucket
    speeds = await repo.get_segment_speeds("r1", "a", time_bucket(NOW))
    assert speeds[1] == pytest.approx(36, abs=1)


# --- API --------------------------------------------------------------------------

def _init_data(user_id: int, auth_date: int) -> str:
    fields = {"auth_date": str(auth_date), "user": json.dumps({"id": user_id}), "query_id": "q"}
    check = "\n".join(f"{k}={v}" for k, v in sorted(fields.items()))
    secret = hmac.new(b"WebAppData", TOKEN.encode(), hashlib.sha256).digest()
    fields["hash"] = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    return urlencode(fields)


def test_init_data_verification():
    data = _init_data(42, int(NOW))
    assert verify_init_data(data, TOKEN, NOW)["id"] == 42
    assert verify_init_data(data, "other:token", NOW) is None
    assert verify_init_data(data.replace("42", "43"), TOKEN, NOW) is None
    assert verify_init_data(data, TOKEN, NOW + 2 * 86400) is None
    assert verify_init_data("garbage", TOKEN, NOW) is None


async def test_api_endpoints(network, repo, sessionmaker):
    settings = Settings(bot_token=TOKEN)
    app = create_app(settings, network, repo, sessionmaker)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
        assert (await c.get("/api/routes")).status_code == 401
        h = {"X-Telegram-Init-Data": _init_data(1, int(time.time()))}
        routes = (await c.get("/api/routes", headers=h)).json()
        assert routes[0]["directions"][0]["stops"][0]["id"] == "st00"
        assert (await c.get("/api/vehicles?route=r1&dir=a", headers=h)).json() == []
        statuses = (await c.get("/api/stops/status?route=r1&dir=a", headers=h)).json()
        assert len(statuses) == 11 and statuses[0]["level"] is None
        assert (await c.get("/api/vehicles?route=nope&dir=a", headers=h)).status_code == 404
        assert (await c.get("/app/")).status_code == 200
