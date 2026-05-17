"""Public booking seat-map helpers (floor grouping, visual status, summary)."""

from __future__ import annotations

from collections import defaultdict

from .models import Room
from .serializers import PublicRoomSerializer

VISUAL_MAINTENANCE = "maintenance"
VISUAL_FULL = "full"
VISUAL_AVAIL_SINGLE = "avail_single"
VISUAL_AVAIL_SHARED = "avail_shared"
VISUAL_PARTIAL = "partial"


def is_room_publicly_bookable(room: Room) -> bool:
    return room.room_status == "available" and room.current_occupancy < room.occupancy_limit


def seatmap_visual_status(room: Room) -> str:
    if room.room_status == "maintenance":
        return VISUAL_MAINTENANCE
    if not is_room_publicly_bookable(room):
        return VISUAL_FULL
    if room.current_occupancy == 0:
        return VISUAL_AVAIL_SINGLE if room.occupancy_limit <= 1 else VISUAL_AVAIL_SHARED
    return VISUAL_PARTIAL


def room_sharing(room: Room) -> str:
    return "single" if room.occupancy_limit <= 1 else "shared"


def floor_sort_key(floor: str) -> tuple:
    raw = (floor or "").strip()
    if raw.isdigit():
        return (0, int(raw), raw)
    return (1, 0, raw.lower())


def floor_display_label(floor: str) -> str:
    raw = (floor or "").strip() or "?"
    if raw.isdigit():
        n = int(raw)
        if 10 <= n % 100 <= 20:
            suffix = "th"
        else:
            suffix = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
        return f"{n}{suffix}"
    return raw


def serialize_seatmap_room(room: Room) -> dict:
    base = PublicRoomSerializer(room).data
    free_beds = max(0, room.occupancy_limit - room.current_occupancy)
    base.update(
        {
            "sharing": room_sharing(room),
            "visual_status": seatmap_visual_status(room),
            "selectable": is_room_publicly_bookable(room),
            "free_beds": free_beds,
        }
    )
    return base


def build_public_seatmap_payload(*, tenant) -> dict:
    rooms = list(
        Room.objects.alive()
        .filter(tenant=tenant)
        .order_by("floor", "room_number")
    )
    by_floor: dict[str, list[Room]] = defaultdict(list)
    for room in rooms:
        key = (room.floor or "").strip() or "0"
        by_floor[key].append(room)

    floors_out = []
    total_rooms = len(rooms)
    available_rooms = 0
    free_beds = 0
    full_rooms = 0

    for floor_key in sorted(by_floor.keys(), key=floor_sort_key):
        floor_rooms = by_floor[floor_key]
        serialized = [serialize_seatmap_room(r) for r in floor_rooms]
        floor_avail = sum(1 for s in serialized if s["visual_status"] not in (VISUAL_FULL, VISUAL_MAINTENANCE))
        floors_out.append(
            {
                "key": floor_key,
                "label": floor_display_label(floor_key),
                "sort_order": floor_sort_key(floor_key)[1] if floor_sort_key(floor_key)[0] == 0 else 999,
                "available_count": floor_avail,
                "rooms": serialized,
            }
        )
        for s in serialized:
            if s["visual_status"] in (VISUAL_FULL, VISUAL_MAINTENANCE):
                if s["visual_status"] == VISUAL_FULL:
                    full_rooms += 1
            else:
                available_rooms += 1
                free_beds += s["free_beds"]

    return {
        "schema_version": "1.0",
        "tenant": {"slug": tenant.slug, "name": tenant.name},
        "summary": {
            "total_rooms": total_rooms,
            "available_rooms": available_rooms,
            "free_beds": free_beds,
            "full_rooms": full_rooms,
        },
        "floors": floors_out,
    }
