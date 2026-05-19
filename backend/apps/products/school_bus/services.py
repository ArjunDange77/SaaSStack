from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.utils import timezone

from apps.registry.activity import log_activity
from apps.registry.models import ActivityLog

from .models import (
    Bus,
    Driver,
    FeeRecord,
    FeePayment,
    Incident,
    Parent,
    Reminder,
    Route,
    RouteStop,
    Student,
    Trip,
    TripAttendance,
)


def _today():
    return timezone.localdate()


def ensure_trip_for_driver(tenant, driver: Driver, trip_date: date | None = None) -> Trip:
    trip_date = trip_date or _today()
    route = driver.assigned_route
    bus = driver.assigned_bus
    if route is None or bus is None:
        raise ValueError("Driver must have assigned route and bus")
    trip, _ = Trip.objects.get_or_create(
        tenant=tenant,
        route=route,
        bus=bus,
        driver=driver,
        trip_date=trip_date,
        defaults={"status": Trip.STATUS_SCHEDULED},
    )
    students = Student.objects.filter(tenant=tenant, assigned_route=route)
    for student in students:
        TripAttendance.objects.get_or_create(
            tenant=tenant,
            trip=trip,
            student=student,
        )
    return trip


def start_trip(trip: Trip) -> Trip:
    if trip.status not in (Trip.STATUS_SCHEDULED,):
        raise ValueError(f"Cannot start trip in status {trip.status}")
    trip.status = Trip.STATUS_STARTED
    trip.started_at = timezone.now()
    trip.save(update_fields=["status", "started_at", "updated_at"])
    return trip


def mark_attendance(trip: Trip, marks: list[dict], user) -> int:
    if trip.status not in (
        Trip.STATUS_STARTED,
        Trip.STATUS_PICKUP_IN_PROGRESS,
        Trip.STATUS_INCIDENT_REPORTED,
    ):
        raise ValueError("Trip is not active for attendance")
    if trip.status == Trip.STATUS_STARTED:
        trip.status = Trip.STATUS_PICKUP_IN_PROGRESS
        trip.save(update_fields=["status", "updated_at"])
    updated = 0
    now = timezone.now()
    for item in marks:
        student_id = item.get("student_id")
        if not student_id:
            continue
        record = TripAttendance.objects.filter(trip=trip, student_id=student_id).first()
        if record is None:
            continue
        if "pickup_status" in item:
            record.pickup_status = item["pickup_status"]
        if "drop_status" in item:
            record.drop_status = item["drop_status"]
        record.marked_at = now
        record.marked_by = user
        record.save()
        updated += 1
    return updated


def complete_trip(trip: Trip) -> Trip:
    if trip.status not in (
        Trip.STATUS_PICKUP_IN_PROGRESS,
        Trip.STATUS_STARTED,
        Trip.STATUS_INCIDENT_REPORTED,
    ):
        raise ValueError(f"Cannot complete trip in status {trip.status}")
    trip.status = Trip.STATUS_COMPLETED
    trip.completed_at = timezone.now()
    trip.save(update_fields=["status", "completed_at", "updated_at"])
    return trip


def record_fee_payment(fee_record: FeeRecord, amount: Decimal, note: str = "") -> FeePayment:
    payment = FeePayment.objects.create(
        tenant=fee_record.tenant,
        fee_record=fee_record,
        amount=amount,
        note=note,
    )
    total_paid = fee_record.payments.aggregate(s=Sum("amount"))["s"] or Decimal("0")
    if total_paid >= fee_record.amount:
        fee_record.status = FeeRecord.STATUS_PAID
        fee_record.student.fee_status = Student.FEE_PAID
    elif total_paid > 0:
        fee_record.status = FeeRecord.STATUS_PARTIAL
        fee_record.student.fee_status = Student.FEE_PARTIAL
    else:
        fee_record.status = FeeRecord.STATUS_UNPAID
        fee_record.student.fee_status = Student.FEE_UNPAID
    fee_record.save(update_fields=["status", "updated_at"])
    fee_record.student.save(update_fields=["fee_status", "updated_at"])
    return payment


def broadcast_reminder(tenant, *, kind: str, title: str, body: str, parent: Parent | None = None) -> list[Reminder]:
    created = []
    if parent:
        targets = [parent]
    else:
        targets = list(Parent.objects.filter(tenant=tenant))
    for p in targets:
        reminder = Reminder.objects.create(
            tenant=tenant,
            audience=Reminder.AUDIENCE_PARENT if parent else Reminder.AUDIENCE_ALL,
            parent=p if parent else None,
            kind=kind,
            title=title,
            body=body,
        )
        created.append(reminder)
        log_activity(
            tenant=tenant,
            resource_slug="sb-reminders",
            verb="reminder",
            message=f"Reminder: {title}",
            object_id=reminder.pk,
            metadata={"kind": kind, "parent_id": p.id},
        )
    return created


def driver_today_payload(tenant, driver: Driver) -> dict:
    trip = ensure_trip_for_driver(tenant, driver)
    route_stops = (
        RouteStop.objects.filter(tenant=tenant, route=trip.route)
        .select_related("stop")
        .order_by("sequence")
    )
    attendance = {
        a.student_id: a
        for a in TripAttendance.objects.filter(trip=trip).select_related("student", "student__pickup_stop")
    }
    checklist = []
    for rs in route_stops:
        for student in Student.objects.filter(tenant=tenant, assigned_route=trip.route, pickup_stop=rs.stop):
            att = attendance.get(student.id)
            checklist.append(
                {
                    "student_id": student.id,
                    "full_name": student.full_name,
                    "stop_name": rs.stop.name,
                    "sequence": rs.sequence,
                    "estimated_time": rs.estimated_time.isoformat() if rs.estimated_time else None,
                    "pickup_status": att.pickup_status if att else TripAttendance.NOT_MARKED,
                    "drop_status": att.drop_status if att else TripAttendance.NOT_MARKED,
                }
            )
    for student in Student.objects.filter(tenant=tenant, assigned_route=trip.route, pickup_stop__isnull=True):
        att = attendance.get(student.id)
        checklist.append(
            {
                "student_id": student.id,
                "full_name": student.full_name,
                "stop_name": "",
                "sequence": 999,
                "estimated_time": None,
                "pickup_status": att.pickup_status if att else TripAttendance.NOT_MARKED,
                "drop_status": att.drop_status if att else TripAttendance.NOT_MARKED,
            }
        )
    checklist.sort(key=lambda x: (x["sequence"], x["full_name"]))
    return {
        "trip_id": trip.id,
        "trip_status": trip.status,
        "trip_date": str(trip.trip_date),
        "route": {"id": trip.route_id, "name": trip.route.name, "direction": trip.route.direction},
        "bus": {"id": trip.bus_id, "fleet_number": trip.bus.fleet_number},
        "checklist": checklist,
    }


def parent_me_payload(tenant, parent: Parent) -> dict:
    children = Student.objects.filter(tenant=tenant, parent=parent).select_related(
        "assigned_route", "assigned_bus", "pickup_stop", "drop_stop"
    )
    today = _today()
    child_rows = []
    for child in children:
        trip = Trip.objects.filter(
            tenant=tenant,
            route=child.assigned_route,
            trip_date=today,
        ).first()
        att = None
        if trip:
            att = TripAttendance.objects.filter(trip=trip, student=child).first()
        overdue = FeeRecord.objects.filter(
            tenant=tenant,
            student=child,
            status=FeeRecord.STATUS_UNPAID,
            due_date__lt=today,
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        child_rows.append(
            {
                "id": child.id,
                "full_name": child.full_name,
                "school_name": child.school_name,
                "class_grade": child.class_grade,
                "route_name": child.assigned_route.name if child.assigned_route else "",
                "bus_number": child.assigned_bus.fleet_number if child.assigned_bus else "",
                "pickup_stop": child.pickup_stop.name if child.pickup_stop else "",
                "drop_stop": child.drop_stop.name if child.drop_stop else "",
                "pickup_status": att.pickup_status if att else TripAttendance.NOT_MARKED,
                "drop_status": att.drop_status if att else TripAttendance.NOT_MARKED,
                "fee_status": child.fee_status,
                "fee_overdue_amount": str(overdue),
            }
        )
    reminders = Reminder.objects.filter(tenant=tenant).filter(
        Q(parent=parent) | Q(audience=Reminder.AUDIENCE_ALL)
    ).filter(read_at__isnull=True)[:10]
    incidents = (
        Incident.objects.filter(tenant=tenant, student__parent=parent)
        .order_by("-created_at")[:5]
        .values("id", "category", "severity", "description", "created_at")
    )
    return {
        "parent": {"id": parent.id, "full_name": parent.full_name},
        "children": child_rows,
        "reminders": [
            {"id": r.id, "kind": r.kind, "title": r.title, "body": r.body, "created_at": r.created_at}
            for r in reminders
        ],
        "recent_incidents": list(incidents),
    }


def operator_dashboard_payload(tenant) -> dict:
    today = _today()
    active_buses = Bus.objects.filter(tenant=tenant, active=True).count()
    ongoing_trips = Trip.objects.filter(
        tenant=tenant,
        trip_date=today,
        status__in=[
            Trip.STATUS_STARTED,
            Trip.STATUS_PICKUP_IN_PROGRESS,
            Trip.STATUS_INCIDENT_REPORTED,
        ],
    ).count()
    today_trips = Trip.objects.filter(tenant=tenant, trip_date=today)
    trip_ids = list(today_trips.values_list("id", flat=True))
    onboard = 0
    absent_today = 0
    if trip_ids:
        onboard = TripAttendance.objects.filter(
            trip_id__in=trip_ids,
            pickup_status=TripAttendance.PRESENT,
        ).count()
        absent_today = TripAttendance.objects.filter(
            trip_id__in=trip_ids,
            pickup_status=TripAttendance.ABSENT,
        ).count()
    overdue_fees = FeeRecord.objects.filter(
        tenant=tenant,
        status__in=[FeeRecord.STATUS_UNPAID, FeeRecord.STATUS_PARTIAL],
        due_date__lt=today,
    ).count()
    incidents_today = Incident.objects.filter(tenant=tenant, created_at__date=today).count()
    total_collected = (
        FeePayment.objects.filter(tenant=tenant, paid_at__date=today).aggregate(s=Sum("amount"))["s"]
        or Decimal("0")
    )
    pending_fees = (
        FeeRecord.objects.filter(
            tenant=tenant,
            status__in=[FeeRecord.STATUS_UNPAID, FeeRecord.STATUS_PARTIAL],
        ).aggregate(s=Sum("amount"))["s"]
        or Decimal("0")
    )
    late_routes = list(
        today_trips.filter(
            status__in=[Trip.STATUS_SCHEDULED, Trip.STATUS_STARTED],
            started_at__isnull=True,
        ).values("id", "route__name", "status")[:5]
    )
    pending_collections = list(
        FeeRecord.objects.filter(
            tenant=tenant,
            status=FeeRecord.STATUS_UNPAID,
        )
        .select_related("student")
        .order_by("due_date")[:5]
        .values("id", "student__full_name", "month", "amount", "due_date", "status")
    )
    recent_incidents = list(
        Incident.objects.filter(tenant=tenant)
        .order_by("-created_at")[:5]
        .values("id", "category", "severity", "description", "created_at")
    )
    return {
        "active_buses": active_buses,
        "ongoing_trips": ongoing_trips,
        "students_onboard": onboard,
        "absent_students_today": absent_today,
        "overdue_fees_count": overdue_fees,
        "incidents_today": incidents_today,
        "total_collected_today": str(total_collected),
        "pending_fees_total": str(pending_fees),
        "late_routes": late_routes,
        "pending_collections": pending_collections,
        "recent_incidents": recent_incidents,
        "total_students": Student.objects.filter(tenant=tenant).count(),
        "total_drivers": Driver.objects.filter(tenant=tenant, status=Driver.STATUS_ACTIVE).count(),
    }
