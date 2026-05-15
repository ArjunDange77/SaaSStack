from datetime import date

from django.core.exceptions import ValidationError
from django.utils import timezone

from .models import BedAssignment, Complaint, RentRecord, Resident, Room


def recalculate_room_occupancy(room: Room) -> None:
    active = BedAssignment.objects.filter(
        room=room, status="active", vacated_date__isnull=True
    ).count()
    room.current_occupancy = active
    if active >= room.occupancy_limit:
        room.room_status = "occupied"
    elif room.room_status == "occupied" and active < room.occupancy_limit:
        room.room_status = "available"
    room.save(update_fields=["current_occupancy", "room_status"])


def validate_assignment(*, tenant, resident, room, exclude_pk=None) -> None:
    if room.room_status == "maintenance":
        raise ValidationError("Room is under maintenance and cannot accept assignments.")
    active_on_room = BedAssignment.objects.filter(
        room=room,
        status="active",
        vacated_date__isnull=True,
    )
    if exclude_pk:
        active_on_room = active_on_room.exclude(pk=exclude_pk)
    if active_on_room.count() >= room.occupancy_limit:
        raise ValidationError("Room is at full occupancy.")
    active_for_resident = BedAssignment.objects.filter(
        tenant=tenant,
        resident=resident,
        status="active",
        vacated_date__isnull=True,
    )
    if exclude_pk:
        active_for_resident = active_for_resident.exclude(pk=exclude_pk)
    if active_for_resident.exists():
        raise ValidationError("Resident already has an active room assignment.")


def sync_resident_on_assign(resident: Resident) -> None:
    resident.active_status = "active"
    if resident.onboarding_status == "pending":
        resident.onboarding_status = "in_progress"
    resident.save(update_fields=["active_status", "onboarding_status"])


def sync_resident_on_vacate(resident: Resident) -> None:
    still_assigned = BedAssignment.objects.filter(
        resident=resident,
        status="active",
        vacated_date__isnull=True,
    ).exists()
    if not still_assigned:
        resident.active_status = "inactive"
        resident.save(update_fields=["active_status"])


def dashboard_stats(tenant):
    today = timezone.now().date()
    residents_qs = Resident.objects.filter(tenant=tenant, deleted_at__isnull=True)
    rooms_qs = Room.objects.filter(tenant=tenant)
    total_rooms = rooms_qs.count()
    occupied_rooms = rooms_qs.filter(room_status="occupied").count()
    occupancy_rate = round((occupied_rooms / total_rooms) * 100, 1) if total_rooms else 0.0
    rent_qs = RentRecord.objects.filter(tenant=tenant, deleted_at__isnull=True)
    return {
        "active_residents": residents_qs.filter(active_status="active").count(),
        "total_rooms": total_rooms,
        "occupied_rooms": occupied_rooms,
        "occupancy_rate": occupancy_rate,
        "open_complaints": Complaint.objects.filter(
            tenant=tenant, deleted_at__isnull=True, status__in=["open", "in_progress"]
        ).count(),
        "rent_due_unpaid": rent_qs.filter(paid_status="unpaid").count(),
        "rent_overdue": rent_qs.filter(paid_status="unpaid", due_date__lt=today).count(),
        "as_of": today.isoformat(),
    }
