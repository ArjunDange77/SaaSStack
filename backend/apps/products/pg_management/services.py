from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db.models import F
from django.utils import timezone

from apps.registry.models import ActivityLog
from apps.tenancy.models import TenantMembership

from .models import BedAssignment, BookingRequest, Complaint, Document, RentRecord, Resident, Room

User = get_user_model()


def recalculate_room_occupancy(room: Room) -> None:
    active = BedAssignment.objects.alive().filter(
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
    active_on_room = BedAssignment.objects.alive().filter(
        room=room,
        status="active",
        vacated_date__isnull=True,
    )
    if exclude_pk:
        active_on_room = active_on_room.exclude(pk=exclude_pk)
    if active_on_room.count() >= room.occupancy_limit:
        raise ValidationError("Room is at full occupancy.")
    active_for_resident = BedAssignment.objects.alive().filter(
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
    still_assigned = BedAssignment.objects.alive().filter(
        resident=resident,
        status="active",
        vacated_date__isnull=True,
    ).exists()
    if not still_assigned:
        resident.active_status = "inactive"
        resident.save(update_fields=["active_status"])


def create_resident_account(*, resident: Resident, username: str, password: str) -> User:
    if resident.user_id:
        raise ValidationError("Resident already has a login account.")
    if User.objects.filter(username=username).exists():
        raise ValidationError("Username already taken.")
    user = User.objects.create_user(username=username, password=password)
    resident.user = user
    resident.save(update_fields=["user"])
    TenantMembership.objects.get_or_create(
        user=user,
        tenant=resident.tenant,
        defaults={"role": TenantMembership.ROLE_RESIDENT, "is_active": True},
    )
    return user


def approve_booking(
    booking: BookingRequest,
    *,
    actor,
    create_login: bool = False,
    username: str = "",
    password: str = "",
) -> Resident:
    if booking.status != "pending":
        raise ValidationError("Only pending bookings can be approved.")
    resident, _ = Resident.objects.get_or_create(
        tenant=booking.tenant,
        phone=booking.phone,
        defaults={
            "full_name": booking.full_name,
            "onboarding_status": "pending",
            "active_status": "inactive",
            "created_by": actor,
            "updated_by": actor,
        },
    )
    if create_login and username and password:
        create_resident_account(resident=resident, username=username, password=password)
    if booking.preferred_room_id:
        BedAssignment.objects.create(
            tenant=booking.tenant,
            resident=resident,
            room=booking.preferred_room,
            assigned_date=timezone.now().date(),
            status="active",
            created_by=actor,
            updated_by=actor,
        )
        sync_resident_on_assign(resident)
        recalculate_room_occupancy(booking.preferred_room)
    booking.status = "approved"
    booking.save(update_fields=["status"])
    return resident


def _trend(current: int, previous: int) -> dict:
    delta = current - previous
    if delta > 0:
        direction = "up"
    elif delta < 0:
        direction = "down"
    else:
        direction = "flat"
    return {"direction": direction, "delta": delta, "period": "7d"}


def _count_in_window(qs, field: str, start: date, end: date) -> int:
    return qs.filter(**{f"{field}__date__gte": start, f"{field}__date__lt": end}).count()


def dashboard_stats(tenant):
    today = timezone.now().date()
    week_start = today - timedelta(days=7)
    prev_week_start = today - timedelta(days=14)
    residents_qs = Resident.objects.alive().filter(tenant=tenant)
    rooms_qs = Room.objects.alive().filter(tenant=tenant)
    total_rooms = rooms_qs.count()
    occupied_rooms = rooms_qs.filter(room_status="occupied").count()
    rooms_available = rooms_qs.filter(room_status="available").count()
    rooms_maintenance = rooms_qs.filter(room_status="maintenance").count()
    rooms_full = (
        rooms_qs.filter(
            room_status="occupied",
            current_occupancy__gte=F("occupancy_limit"),
        ).count()
        if total_rooms
        else 0
    )
    occupancy_rate = round((occupied_rooms / total_rooms) * 100, 1) if total_rooms else 0.0
    rent_qs = RentRecord.objects.alive().filter(tenant=tenant)
    pending_bookings = BookingRequest.objects.alive().filter(
        tenant=tenant, status="pending"
    ).count()
    booking_qs = BookingRequest.objects.alive().filter(tenant=tenant)
    complaint_qs = Complaint.objects.alive().filter(tenant=tenant)
    bookings_this_week = _count_in_window(booking_qs, "created_at", week_start, today + timedelta(days=1))
    bookings_prev_week = _count_in_window(booking_qs, "created_at", prev_week_start, week_start)
    complaints_this_week = _count_in_window(complaint_qs, "created_at", week_start, today + timedelta(days=1))
    complaints_prev_week = _count_in_window(complaint_qs, "created_at", prev_week_start, week_start)
    overdue_now = rent_qs.filter(paid_status="unpaid", due_date__lt=today).count()
    overdue_prev = rent_qs.filter(
        paid_status="unpaid",
        due_date__lt=week_start,
        due_date__gte=prev_week_start,
    ).count()
    trends = {
        "pending_bookings": _trend(bookings_this_week, bookings_prev_week),
        "open_complaints": _trend(complaints_this_week, complaints_prev_week),
        "rent_overdue": _trend(overdue_now, overdue_prev),
        "occupancy_rate": _trend(int(occupancy_rate), int(occupancy_rate)),
    }
    return {
        "active_residents": residents_qs.filter(active_status="active").count(),
        "total_rooms": total_rooms,
        "occupied_rooms": occupied_rooms,
        "rooms_available": rooms_available,
        "rooms_maintenance": rooms_maintenance,
        "rooms_full": rooms_full,
        "occupancy_rate": occupancy_rate,
        "open_complaints": Complaint.objects.alive().filter(
            tenant=tenant, status__in=["open", "in_progress"]
        ).count(),
        "rent_due_unpaid": rent_qs.filter(paid_status="unpaid").count(),
        "rent_overdue": rent_qs.filter(paid_status="unpaid", due_date__lt=today).count(),
        "pending_bookings": pending_bookings,
        "as_of": today.isoformat(),
        "trends": trends,
    }


def resident_portal_bundle(*, tenant, resident: Resident) -> dict:
    assignment = (
        BedAssignment.objects.alive()
        .filter(
            tenant=tenant,
            resident=resident,
            status="active",
            vacated_date__isnull=True,
        )
        .select_related("room")
        .first()
    )
    documents = (
        Document.objects.alive()
        .filter(tenant=tenant, resident=resident)
        .order_by("-created_at")[:20]
    )
    latest_rent = (
        RentRecord.objects.alive()
        .filter(tenant=tenant, resident=resident)
        .order_by("-due_date")
        .first()
    )
    open_complaints = (
        Complaint.objects.alive()
        .filter(
            tenant=tenant,
            resident=resident,
            status__in=["open", "in_progress"],
        )
        .order_by("-created_at")[:10]
    )
    object_ids = [str(resident.pk)]
    if assignment:
        object_ids.append(str(assignment.pk))
    recent_activity = (
        ActivityLog.objects.filter(tenant=tenant, object_id__in=object_ids)
        .select_related("actor")
        .order_by("-created_at")[:15]
    )
    return {
        "profile": {
            "id": resident.id,
            "full_name": resident.full_name,
            "phone": resident.phone,
            "email": resident.email,
            "onboarding_status": resident.onboarding_status,
            "active_status": resident.active_status,
        },
        "assignment": (
            {
                "id": assignment.id,
                "room_number": assignment.room.room_number,
                "floor": assignment.room.floor,
                "assigned_date": assignment.assigned_date.isoformat(),
            }
            if assignment
            else None
        ),
        "documents": [
            {
                "id": d.id,
                "document_type": d.document_type,
                "verification_status": d.verification_status,
            }
            for d in documents
        ],
        "latest_rent": (
            {
                "id": latest_rent.id,
                "amount": str(latest_rent.amount),
                "due_date": latest_rent.due_date.isoformat(),
                "paid_status": latest_rent.paid_status,
            }
            if latest_rent
            else None
        ),
        "open_complaints": [
            {"id": c.id, "title": c.title, "status": c.status, "priority": c.priority}
            for c in open_complaints
        ],
        "recent_activity": [
            {
                "verb": log.verb,
                "message": log.message,
                "created_at": log.created_at.isoformat(),
            }
            for log in recent_activity
        ],
    }