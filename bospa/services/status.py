"""Статус остановок для бота и карты: загруженность, ближайший борт, ETA."""

from dataclasses import dataclass

from bospa.domain.eta import ARRIVAL_SLACK_M, eta_seconds, time_bucket
from bospa.domain.routes import Direction, Network, Stop
from bospa.domain.status import NO_DATA, Status, compute_status
from bospa.infra.redis_repo import RedisRepo


@dataclass
class StopView:
    stop: Stop
    status: Status                  # то, что показываем пользователю
    by_vehicle: bool                # статус посчитан по конкретному борту
    vehicle: dict | None            # ближайший подъезжающий борт
    eta_s: float | None


class StatusService:
    def __init__(self, network: Network, repo: RedisRepo):
        self.network = network
        self.repo = repo

    async def direction_views(self, direction: Direction, now: float) -> list[StopView]:
        route, dir_id = direction.route_id, direction.id
        checkins = await self.repo.get_checkins(route, dir_id, [(s.id, s.idx) for s in direction.stops], now)
        vehicles = sorted(await self.repo.get_vehicles(route, dir_id), key=lambda v: v["s"])
        vloads = await self.repo.get_vehicle_checkins([v["id"] for v in vehicles], now)
        speeds = await self.repo.get_segment_speeds(route, dir_id, time_bucket(now))

        views = []
        for stop in direction.stops:
            upstream = direction.stops[max(0, stop.idx - 3): stop.idx + 1]
            segment_status = compute_status(
                [c for s in upstream for c in checkins.get(s.id, [])], now, stop.idx)

            vehicle = _next_vehicle(vehicles, stop.s)
            eta = eta_seconds(direction, vehicle["s"], stop.s, speeds) if vehicle else None
            if vehicle is None and direction.ring and vehicles:
                # Кольцо: ближайший борт ещё на прошлом круге — едет через конечную
                vehicle = vehicles[-1]
                eta = (eta_seconds(direction, vehicle["s"], direction.line.length, speeds)
                       + eta_seconds(direction, 0.0, stop.s, speeds))
            vehicle_status = NO_DATA
            if vehicle:
                vehicle_status = compute_status(vloads.get(vehicle["id"], []), now, spatial=False)

            if vehicle_status.has_data:
                views.append(StopView(stop, vehicle_status, True, vehicle, eta))
            else:
                views.append(StopView(stop, segment_status, False, vehicle, eta))
        return views

    async def stop_view(self, direction: Direction, stop_id: str, now: float) -> StopView | None:
        for v in await self.direction_views(direction, now):
            if v.stop.id == stop_id:
                return v
        return None


def _next_vehicle(vehicles_by_s: list[dict], stop_s: float) -> dict | None:
    """Ближайший борт перед остановкой (по ходу движения)."""
    best = None
    for v in vehicles_by_s:
        if v["s"] <= stop_s + ARRIVAL_SLACK_M:
            best = v
        else:
            break
    return best
