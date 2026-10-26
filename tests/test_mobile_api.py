"""API мобильного приложения: токен устройства, отметки, поездка."""

import time
from types import SimpleNamespace

import httpx
import pytest_asyncio

from bospa.api import app as app_module
from bospa.api.app import create_app
from bospa.config import Settings
from bospa.domain.status import RED

from .conftest import at


@pytest_asyncio.fixture
async def client(network, repo, sessionmaker):
    app = create_app(Settings(bot_token=None), network, repo, sessionmaker)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
        yield c


async def _register(c: httpx.AsyncClient) -> dict:
    r = await c.post("/api/devices")
    assert r.status_code == 201
    body = r.json()
    return {"Authorization": f"Bearer {body['token']}", "uid": body["user_id"]}


def _h(dev: dict) -> dict:
    return {"Authorization": dev["Authorization"]}


async def test_register_device_and_me(client):
    dev = await _register(client)
    assert dev["uid"] < 0  # отрицательные id не пересекаются с Telegram
    me = (await client.get("/api/me", headers=_h(dev))).json()
    assert me == {"user_id": dev["uid"], "balance": 0}

    other = await _register(client)
    assert other["uid"] != dev["uid"] and other["Authorization"] != dev["Authorization"]

    assert (await client.get("/api/routes", headers=_h(dev))).status_code == 200
    assert (await client.get("/api/me")).status_code == 401
    assert (await client.get("/api/me", headers={"Authorization": "Bearer nope"})).status_code == 401
    assert (await client.get("/api/routes", headers={"Authorization": "Basic x"})).status_code == 401
    # Без BOT_TOKEN initData не проверить — такой запрос считается неавторизованным
    assert (await client.get("/api/routes", headers={"X-Telegram-Init-Data": "auth_date=1"})).status_code == 401


async def test_dev_no_auth_allows_reads_but_not_writes(network, repo, sessionmaker):
    app = create_app(Settings(bot_token=None, api_dev_no_auth=True), network, repo, sessionmaker)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
        assert (await c.get("/api/routes")).status_code == 200
        assert (await c.get("/api/me")).status_code == 401
        body = {"route": "r1", "dir": "a", "stop_id": "st02", "level": RED}
        assert (await c.post("/api/checkins", json=body)).status_code == 401


async def test_checkin_with_location(client):
    dev = await _register(client)
    lat, lon = at(1000)
    assert (await client.post("/api/location", json={"lat": lat, "lon": lon}, headers=_h(dev))).status_code == 204

    body = {"route": "r1", "dir": "a", "stop_id": "st02", "level": RED}
    res = (await client.post("/api/checkins", json=body, headers=_h(dev))).json()
    assert res["accepted"] and res["rewarded"] and res["points"] == 10 and res["balance"] == 10

    again = (await client.post("/api/checkins", json=body, headers=_h(dev))).json()
    assert not again["accepted"]
    assert (await client.get("/api/me", headers=_h(dev))).json()["balance"] == 10

    statuses = (await client.get("/api/stops/status?route=r1&dir=a", headers=_h(dev))).json()
    assert any(s["count"] > 0 for s in statuses)


async def test_checkin_validation(client):
    dev = await _register(client)
    base = {"route": "r1", "dir": "a", "stop_id": "st02", "level": RED}
    assert (await client.post("/api/checkins", json={**base, "stop_id": "nope"}, headers=_h(dev))).status_code == 404
    assert (await client.post("/api/checkins", json={**base, "level": 7}, headers=_h(dev))).status_code == 422
    assert (await client.post("/api/location", json={"lat": 91, "lon": 0}, headers=_h(dev))).status_code == 422


async def test_ride_flow(client, monkeypatch):
    clock = [time.time()]
    monkeypatch.setattr(app_module, "time", SimpleNamespace(time=lambda: clock[0]))
    dev = await _register(client)

    def point(s):
        lat, lon = at(s)
        return {"lat": lat, "lon": lon}

    assert (await client.post("/api/ride/location", json=point(1000), headers=_h(dev))).status_code == 409
    assert (await client.post("/api/ride", json={"route": "r1", "dir": "x"}, headers=_h(dev))).status_code == 404
    assert (await client.post("/api/ride", json={"route": "r1", "dir": "a"}, headers=_h(dev))).status_code == 204

    first = (await client.post("/api/ride/location", json=point(1000), headers=_h(dev))).json()
    assert first["awarded"] == 0
    clock[0] += 10
    await client.post("/api/ride/location", json=point(1100), headers=_h(dev))
    clock[0] += 300
    upd = (await client.post("/api/ride/location", json=point(1300), headers=_h(dev))).json()
    assert upd["valid"] and upd["awarded"] == 5 and upd["balance"] == 5

    assert (await client.delete("/api/ride", headers=_h(dev))).status_code == 204
    assert (await client.post("/api/ride/location", json=point(1400), headers=_h(dev))).status_code == 409
