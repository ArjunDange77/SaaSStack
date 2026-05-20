from __future__ import annotations

import calendar
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import OuterRef, Q, Subquery, Sum
from django.utils import timezone

from apps.registry.activity import log_activity

from .models import (
    Bus,
    Driver,
    FeeRecord,
    FeePayment,
    Incident,
    OutboundMessage,
    Parent,
    Reminder,
    Route,
    RouteStop,
    Student,
    TenantHoliday,
    Trip,
    TripAttendance,
    TripLocation,
)


def _today():
    return timezone.localdate()


DRIVER_ACTIVE_STATUSES = (
    Trip.STATUS_SCHEDULED,
    Trip.STATUS_DELAYED,
    Trip.STATUS_STARTED,
    Trip.STATUS_PICKUP_IN_PROGRESS,
    Trip.STATUS_INCIDENT_REPORTED,
)

TRACKABLE_TRIP_STATUSES = (
    Trip.STATUS_STARTED,
    Trip.STATUS_PICKUP_IN_PROGRESS,
    Trip.STATUS_DELAYED,
    Trip.STATUS_INCIDENT_REPORTED,
)

LOCATION_STALE_SECONDS = 180


def _serialize_location(loc: TripLocation | None) -> dict | None:
    if loc is None:
        return None
    return {
        "latitude": str(loc.latitude),
        "longitude": str(loc.longitude),
        "recorded_at": loc.recorded_at.isoformat(),
    }


def _location_is_stale(recorded_at) -> bool:
    if recorded_at is None:
        return True
    age = (timezone.now() - recorded_at).total_seconds()
    return age > LOCATION_STALE_SECONDS


def _latest_trip_location(tenant, trip: Trip) -> TripLocation | None:
    return (
        TripLocation.objects.filter(tenant=tenant, trip=trip).order_by("-recorded_at").first()
    )


def _child_tracking(tenant, trip: Trip | None) -> dict:
    inactive = {
        "active": False,
        "trip_id": None,
        "last_location": None,
        "stale": True,
    }
    if trip is None or trip.status not in TRACKABLE_TRIP_STATUSES:
        return inactive
    loc = _latest_trip_location(tenant, trip)
    last = _serialize_location(loc)
    return {
        "active": True,
        "trip_id": trip.id,
        "last_location": last,
        "stale": _location_is_stale(loc.recorded_at if loc else None),
    }


def _trip_health_signals(tenant, trip: Trip) -> dict:
    """Operator-facing trip health for briefing / live fleet."""
    now = timezone.localtime()
    not_started = trip.status in (Trip.STATUS_SCHEDULED, Trip.STATUS_DELAYED) and trip.started_at is None
    if not_started and now.date() == trip.trip_date:
        not_started = (now.hour, now.minute) >= (8, 0)
    loc = _latest_trip_location(tenant, trip)
    gps_stale = trip.status in TRACKABLE_TRIP_STATUSES and (
        loc is None or _location_is_stale(loc.recorded_at)
    )
    not_marked = TripAttendance.objects.filter(
        trip=trip, pickup_status=TripAttendance.NOT_MARKED
    ).count()
    return {
        "not_started": not_started,
        "gps_stale": gps_stale,
        "not_marked_count": not_marked,
    }


def get_driver_today_trip(tenant, driver: Driver) -> Trip | None:
    """Today's active trip for this driver (excludes completed/cancelled)."""
    return (
        Trip.objects.filter(
            tenant=tenant,
            driver=driver,
            trip_date=_today(),
            status__in=DRIVER_ACTIVE_STATUSES,
        )
        .select_related("route", "bus")
        .first()
    )


def _ensure_attendance_for_trip(trip: Trip) -> None:
    students = Student.objects.filter(tenant=trip.tenant, assigned_route=trip.route)
    for student in students:
        TripAttendance.objects.get_or_create(
            tenant=trip.tenant,
            trip=trip,
            student=student,
        )


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
    _ensure_attendance_for_trip(trip)
    return trip


def flag_delayed_trips(tenant, trip_date: date | None = None) -> int:
    """Mark today's scheduled trips without a start time as delayed (morning ops)."""
    trip_date = trip_date or _today()
    now = timezone.localtime()
    if now.date() != trip_date:
        return 0
    # After 07:30 local, unstarted morning trips count as delayed for the dashboard.
    if (now.hour, now.minute) < (7, 30):
        return 0
    updated = Trip.objects.filter(
        tenant=tenant,
        trip_date=trip_date,
        status=Trip.STATUS_SCHEDULED,
        started_at__isnull=True,
    ).update(status=Trip.STATUS_DELAYED)
    return updated


def start_trip(trip: Trip) -> Trip:
    if trip.status not in (Trip.STATUS_SCHEDULED, Trip.STATUS_DELAYED):
        raise ValueError(f"Cannot start trip in status {trip.status}")
    _ensure_attendance_for_trip(trip)
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
        if "pickup_absent_reason" in item:
            record.pickup_absent_reason = item["pickup_absent_reason"] or ""
        record.marked_at = now
        record.marked_by = user
        record.save()
        if record.pickup_status == TripAttendance.ABSENT:
            from .notifications import notify_attendance_marked

            stop_name = ""
            if record.student.pickup_stop_id:
                stop_name = record.student.pickup_stop.name
            notify_attendance_marked(
                trip.tenant,
                student=record.student,
                pickup_status=record.pickup_status,
                stop_name=stop_name,
            )
        updated += 1
    return updated


def build_trip_summary(trip: Trip) -> dict:
    """Snapshot attendance + duration for owner views after complete."""
    tenant = trip.tenant
    atts = TripAttendance.objects.filter(trip=trip)
    present = atts.filter(pickup_status=TripAttendance.PRESENT).count()
    absent = atts.filter(pickup_status=TripAttendance.ABSENT).count()
    not_marked = atts.filter(pickup_status=TripAttendance.NOT_MARKED).count()
    duration_minutes = None
    if trip.started_at and trip.completed_at:
        duration_minutes = int((trip.completed_at - trip.started_at).total_seconds() // 60)
    loc_count = TripLocation.objects.filter(tenant=tenant, trip=trip).count()
    gps_coverage_pct = 0
    if trip.started_at and trip.completed_at and duration_minutes and duration_minutes > 0:
        expected_pings = max(1, duration_minutes // 1)
        gps_coverage_pct = min(100, int(100 * loc_count / expected_pings))
    incidents = Incident.objects.filter(tenant=tenant, trip=trip).count()
    return {
        "trip_id": trip.id,
        "route_name": trip.route.name,
        "bus_fleet_number": trip.bus.fleet_number,
        "driver_name": trip.driver.full_name,
        "duration_minutes": duration_minutes,
        "present_count": present,
        "absent_count": absent,
        "not_marked_count": not_marked,
        "gps_coverage_pct": gps_coverage_pct,
        "incident_count": incidents,
        "completed_at": trip.completed_at.isoformat() if trip.completed_at else None,
    }


def complete_trip(trip: Trip) -> Trip:
    if trip.status not in (
        Trip.STATUS_PICKUP_IN_PROGRESS,
        Trip.STATUS_STARTED,
        Trip.STATUS_INCIDENT_REPORTED,
    ):
        raise ValueError(f"Cannot complete trip in status {trip.status}")
    now = timezone.now()
    unmarked = TripAttendance.objects.filter(
        trip=trip, pickup_status=TripAttendance.NOT_MARKED
    )
    for record in unmarked:
        record.pickup_status = TripAttendance.PRESENT
        record.marked_at = now
        record.save(update_fields=["pickup_status", "marked_at", "updated_at"])
    trip.status = Trip.STATUS_COMPLETED
    trip.completed_at = timezone.now()
    trip.summary_json = build_trip_summary(trip)
    trip.save(update_fields=["status", "completed_at", "summary_json", "updated_at"])
    return trip


def reset_trip_for_demo(trip: Trip) -> Trip:
    """Clear trip progress and move to today so the assigned driver can start fresh."""
    today = _today()
    conflict = (
        Trip.objects.filter(
            tenant=trip.tenant,
            route=trip.route,
            bus=trip.bus,
            driver=trip.driver,
            trip_date=today,
        )
        .exclude(pk=trip.pk)
        .first()
    )
    if conflict is not None:
        raise ValueError(
            f"A trip already exists for this route, bus, and driver on {today} "
            f"(trip #{conflict.id}). Remove or reset that trip first."
        )

    TripLocation.objects.filter(trip=trip).delete()
    TripAttendance.objects.filter(trip=trip).update(
        pickup_status=TripAttendance.NOT_MARKED,
        drop_status=TripAttendance.NOT_MARKED,
        pickup_absent_reason="",
        marked_at=None,
        marked_by=None,
    )

    trip.status = Trip.STATUS_SCHEDULED
    trip.trip_date = today
    trip.started_at = None
    trip.completed_at = None
    trip.summary_json = None
    trip.save(
        update_fields=[
            "status",
            "trip_date",
            "started_at",
            "completed_at",
            "summary_json",
            "updated_at",
        ]
    )
    _ensure_attendance_for_trip(trip)
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


def _build_checklist_for_trip(tenant, trip: Trip) -> list[dict]:
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
                    "pickup_absent_reason": att.pickup_absent_reason if att else "",
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
                "pickup_absent_reason": att.pickup_absent_reason if att else "",
            }
        )
    checklist.sort(key=lambda x: (x["sequence"], x["full_name"]))
    return checklist


def driver_today_payload(tenant, driver: Driver) -> dict:
    route = driver.assigned_route
    bus = driver.assigned_bus
    today = _today()
    empty = {
        "trip_id": None,
        "trip_status": None,
        "trip_date": str(today),
        "started_at": None,
        "driver_name": driver.full_name,
        "route_name": route.name if route else "",
        "bus_fleet_number": bus.fleet_number if bus else "",
        "route": (
            {"id": route.id, "name": route.name, "direction": route.direction}
            if route
            else {"id": None, "name": "", "direction": ""}
        ),
        "bus": (
            {"id": bus.id, "fleet_number": bus.fleet_number}
            if bus
            else {"id": None, "fleet_number": ""}
        ),
        "checklist": [],
        "can_open_checklist": False,
        "last_location": None,
        "progress": {"marked_count": 0, "total_students": 0, "not_marked_count": 0},
        "completed_summary": None,
    }

    trip = get_driver_today_trip(tenant, driver)
    if trip is None:
        completed = (
            Trip.objects.filter(
                tenant=tenant,
                driver=driver,
                trip_date=today,
                status=Trip.STATUS_COMPLETED,
            )
            .select_related("route", "bus")
            .first()
        )
        if completed:
            empty["trip_id"] = completed.id
            empty["trip_status"] = completed.status
            empty["started_at"] = (
                completed.started_at.isoformat() if completed.started_at else None
            )
            empty["route_name"] = completed.route.name
            empty["bus_fleet_number"] = completed.bus.fleet_number
            empty["route"] = {
                "id": completed.route_id,
                "name": completed.route.name,
                "direction": completed.route.direction,
            }
            empty["bus"] = {"id": completed.bus_id, "fleet_number": completed.bus.fleet_number}
            empty["completed_summary"] = completed.summary_json or build_trip_summary(completed)
        return empty

    can_open = trip.status not in (Trip.STATUS_SCHEDULED, Trip.STATUS_DELAYED)
    checklist = _build_checklist_for_trip(tenant, trip) if can_open else []
    loc = _latest_trip_location(tenant, trip)
    marked_count = sum(1 for row in checklist if row["pickup_status"] != TripAttendance.NOT_MARKED)
    total_students = len(checklist)
    return {
        "trip_id": trip.id,
        "trip_status": trip.status,
        "trip_date": str(trip.trip_date),
        "started_at": trip.started_at.isoformat() if trip.started_at else None,
        "driver_name": driver.full_name,
        "route_name": trip.route.name,
        "bus_fleet_number": trip.bus.fleet_number,
        "route": {"id": trip.route_id, "name": trip.route.name, "direction": trip.route.direction},
        "bus": {"id": trip.bus_id, "fleet_number": trip.bus.fleet_number},
        "checklist": checklist,
        "can_open_checklist": can_open,
        "last_location": _serialize_location(loc),
        "progress": {
            "marked_count": marked_count,
            "total_students": total_students,
            "not_marked_count": total_students - marked_count,
        },
        "completed_summary": None,
    }


def record_trip_location(trip: Trip, latitude: Decimal, longitude: Decimal) -> TripLocation:
    return TripLocation.objects.create(
        tenant=trip.tenant,
        trip=trip,
        latitude=latitude,
        longitude=longitude,
    )


def _parent_hero_status(trip: Trip | None, att: TripAttendance | None, child: Student) -> dict:
    if trip is None or trip.status == Trip.STATUS_SCHEDULED:
        return {"level": "neutral", "headline": f"{child.full_name} — trip not started", "detail": ""}
    if att and att.pickup_status == TripAttendance.ABSENT:
        reason = att.pickup_absent_reason or "absent"
        return {
            "level": "danger",
            "headline": f"{child.full_name} marked absent today",
            "detail": reason.replace("_", " ").title(),
        }
    if att and att.pickup_status == TripAttendance.PRESENT:
        stop = child.pickup_stop.name if child.pickup_stop else "stop"
        t = (
            timezone.localtime(att.marked_at).strftime("%I:%M %p").lstrip("0")
            if att.marked_at
            else ""
        )
        return {
            "level": "safe",
            "headline": f"{child.full_name} is on the bus",
            "detail": f"Picked up at {stop}" + (f" · {t}" if t else ""),
        }
    if trip.status in (Trip.STATUS_STARTED, Trip.STATUS_PICKUP_IN_PROGRESS, Trip.STATUS_DELAYED):
        return {
            "level": "warning",
            "headline": f"Bus en route for {child.full_name}",
            "detail": child.pickup_stop.name if child.pickup_stop else trip.route.name,
        }
    return {"level": "neutral", "headline": child.full_name, "detail": trip.status}


def _attendance_calendar_days(tenant, student: Student, year: int, month: int) -> list[dict]:
    _, last_day = calendar.monthrange(year, month)
    start = date(year, month, 1)
    end = date(year, month, last_day)
    att_by_date = {}
    for att in TripAttendance.objects.filter(
        tenant=tenant,
        student=student,
        trip__trip_date__gte=start,
        trip__trip_date__lte=end,
    ).select_related("trip"):
        att_by_date[att.trip.trip_date] = att
    days = []
    for d in range(1, last_day + 1):
        day = date(year, month, d)
        att = att_by_date.get(day)
        if att is None:
            if day.weekday() < 5:
                days.append({"date": str(day), "status": "none"})
            continue
        if att.pickup_status == TripAttendance.PRESENT:
            days.append({"date": str(day), "status": "present"})
        elif att.pickup_status == TripAttendance.ABSENT:
            days.append(
                {
                    "date": str(day),
                    "status": "absent",
                    "reason": att.pickup_absent_reason or "",
                }
            )
        else:
            days.append({"date": str(day), "status": "none"})
    return days


def _child_today_trip_summary(trip: Trip | None, att: TripAttendance | None) -> dict | None:
    if trip is None:
        return None
    pickup_time = ""
    if att and att.pickup_status == TripAttendance.PRESENT and att.marked_at:
        pickup_time = timezone.localtime(att.marked_at).strftime("%I:%M %p").lstrip("0")
    summary = {
        "trip_id": trip.id,
        "trip_date": str(trip.trip_date),
        "trip_status": trip.status,
        "route_name": trip.route.name,
        "bus_number": trip.bus.fleet_number,
        "pickup_status": att.pickup_status if att else TripAttendance.NOT_MARKED,
        "pickup_time": pickup_time,
        "started_at": trip.started_at.isoformat() if trip.started_at else None,
        "completed_at": trip.completed_at.isoformat() if trip.completed_at else None,
    }
    if trip.status == Trip.STATUS_COMPLETED and trip.summary_json:
        summary["present_count"] = trip.summary_json.get("present_count", 0)
        summary["absent_count"] = trip.summary_json.get("absent_count", 0)
        summary["duration_minutes"] = trip.summary_json.get("duration_minutes")
    return summary


def parent_me_payload(tenant, parent: Parent) -> dict:
    children = Student.objects.filter(tenant=tenant, parent=parent).select_related(
        "assigned_route", "assigned_bus", "pickup_stop", "drop_stop"
    )
    today = _today()
    child_rows = []
    for child in children:
        trip = (
            Trip.objects.filter(
                tenant=tenant,
                route=child.assigned_route,
                trip_date=today,
            )
            .select_related("route", "bus")
            .first()
        )
        att = None
        if trip:
            att = TripAttendance.objects.filter(trip=trip, student=child).first()
        overdue = FeeRecord.objects.filter(
            tenant=tenant,
            student=child,
            status=FeeRecord.STATUS_UNPAID,
            due_date__lt=today,
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        fee_records = list(
            FeeRecord.objects.filter(tenant=tenant, student=child).order_by("-month")[:3]
        )
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
                "hero_status": _parent_hero_status(trip, att, child),
                "today_trip_summary": _child_today_trip_summary(trip, att),
                "tracking": _child_tracking(tenant, trip),
                "calendar_days": _attendance_calendar_days(tenant, child, today.year, today.month),
                "fees": [
                    {
                        "month": fr.month,
                        "amount": str(fr.amount),
                        "status": fr.status,
                        "due_date": str(fr.due_date),
                        "payment_link_url": fr.payment_link_url or "",
                    }
                    for fr in fee_records
                ],
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


def operator_attendance_history_payload(tenant, limit: int = 50) -> list[dict]:
    qs = (
        TripAttendance.objects.filter(tenant=tenant)
        .select_related("student", "trip", "trip__route")
        .order_by("-marked_at", "-id")[:limit]
    )
    rows = []
    for att in qs:
        rows.append(
            {
                "id": att.id,
                "trip_id": att.trip_id,
                "trip_date": str(att.trip.trip_date),
                "route_name": att.trip.route.name,
                "student_id": att.student_id,
                "student_name": att.student.full_name,
                "pickup_status": att.pickup_status,
                "drop_status": att.drop_status,
                "marked_at": att.marked_at.isoformat() if att.marked_at else None,
            }
        )
    return rows


def _is_holiday(tenant, trip_date: date) -> bool:
    return TenantHoliday.objects.filter(tenant=tenant, holiday_date=trip_date).exists()


def driver_schedule_payload(tenant, driver: Driver, days: int = 7) -> dict:
    """Upcoming trips and holidays for the driver's calendar."""
    days = max(1, min(int(days), 31))
    start = _today()
    end = start + timedelta(days=days - 1)
    trips = (
        Trip.objects.filter(
            tenant=tenant,
            driver=driver,
            trip_date__gte=start,
            trip_date__lte=end,
        )
        .select_related("route", "bus")
        .order_by("trip_date", "id")
    )
    holiday_rows = TenantHoliday.objects.filter(
        tenant=tenant,
        holiday_date__gte=start,
        holiday_date__lte=end,
    ).order_by("holiday_date")
    return {
        "days": days,
        "start_date": str(start),
        "end_date": str(end),
        "trips": [
            {
                "trip_id": t.id,
                "trip_date": str(t.trip_date),
                "status": t.status,
                "route_name": t.route.name,
                "bus_fleet_number": t.bus.fleet_number,
                "is_today": t.trip_date == start,
            }
            for t in trips
        ],
        "holidays": [
            {"id": h.id, "holiday_date": str(h.holiday_date), "name": h.name or "Holiday"}
            for h in holiday_rows
        ],
    }


def operator_holidays_payload(tenant, start: date | None = None, end: date | None = None) -> list[dict]:
    qs = TenantHoliday.objects.filter(tenant=tenant)
    if start:
        qs = qs.filter(holiday_date__gte=start)
    if end:
        qs = qs.filter(holiday_date__lte=end)
    return [
        {"id": h.id, "holiday_date": str(h.holiday_date), "name": h.name or "Holiday"}
        for h in qs.order_by("holiday_date")
    ]


def create_tenant_holiday(tenant, holiday_date: date, name: str = "") -> TenantHoliday:
    return TenantHoliday.objects.create(
        tenant=tenant,
        holiday_date=holiday_date,
        name=name.strip(),
    )


def delete_tenant_holiday(tenant, holiday_id: int) -> None:
    deleted, _ = TenantHoliday.objects.filter(tenant=tenant, id=holiday_id).delete()
    if not deleted:
        raise ValueError("Holiday not found")


def _generate_trips_for_date(tenant, trip_date: date) -> int:
    if trip_date.weekday() >= 5:
        return 0
    if _is_holiday(tenant, trip_date):
        return 0
    routes = Route.objects.filter(tenant=tenant, active=True)
    created = 0
    for route in routes.select_related("default_driver", "default_driver__assigned_bus"):
        driver = route.default_driver
        bus = driver.assigned_bus if driver else None
        if not driver or not bus:
            continue
        trip, was_created = Trip.objects.get_or_create(
            tenant=tenant,
            route=route,
            bus=bus,
            driver=driver,
            trip_date=trip_date,
            defaults={"status": Trip.STATUS_SCHEDULED},
        )
        if was_created:
            created += 1
        _ensure_attendance_for_trip(trip)
    return created


def generate_daily_trips(tenant=None, trip_date: date | None = None) -> int:
    """Create scheduled trips for today (weekdays). Idempotent per route+date."""
    trip_date = trip_date or _today()
    if tenant is None:
        total = 0
        from apps.tenancy.models import Tenant

        for t in Tenant.objects.filter(is_active=True):
            total += _generate_trips_for_date(t, trip_date)
        return total
    return _generate_trips_for_date(tenant, trip_date)


def generate_trips_for_range(
    tenant, start_date: date, end_date: date
) -> dict:
    """Create scheduled trips for each weekday in [start_date, end_date], skipping holidays."""
    if end_date < start_date:
        raise ValueError("end_date must be on or after start_date")
    created = 0
    skipped_holiday = 0
    skipped_weekend = 0
    d = start_date
    while d <= end_date:
        if d.weekday() >= 5:
            skipped_weekend += 1
        elif _is_holiday(tenant, d):
            skipped_holiday += 1
        else:
            created += _generate_trips_for_date(tenant, d)
        d += timedelta(days=1)
    return {
        "created": created,
        "skipped_holiday": skipped_holiday,
        "skipped_weekend": skipped_weekend,
        "start_date": str(start_date),
        "end_date": str(end_date),
    }


def operator_live_fleet_payload(tenant) -> dict:
    today = _today()
    trips = Trip.objects.filter(
        tenant=tenant,
        trip_date=today,
        status__in=TRACKABLE_TRIP_STATUSES,
    ).select_related("route", "bus")
    rows = []
    for trip in trips:
        loc = _latest_trip_location(tenant, trip)
        student_count = TripAttendance.objects.filter(trip=trip).count()
        rows.append(
            {
                "trip_id": trip.id,
                "route_name": trip.route.name,
                "bus_fleet_number": trip.bus.fleet_number,
                "status": trip.status,
                "last_location": _serialize_location(loc),
                "stale": _location_is_stale(loc.recorded_at if loc else None),
                "student_count": student_count,
                **_trip_health_signals(tenant, trip),
            }
        )
    return {"trips": rows}


def operator_trip_summary_payload(tenant, trip_id: int) -> dict:
    trip = Trip.objects.filter(tenant=tenant, id=trip_id).first()
    if trip is None:
        raise ValueError("Trip not found")
    if trip.summary_json:
        return trip.summary_json
    if trip.status != Trip.STATUS_COMPLETED:
        raise ValueError("Trip summary available after completion")
    return build_trip_summary(trip)


def annotate_student_fee_status(queryset):
    """Annotate queryset with current_fee_status from this month's FeeRecord."""
    current_month = _today().strftime("%Y-%m")
    latest_fee = FeeRecord.objects.filter(
        student=OuterRef("pk"),
        month=current_month,
    ).order_by("-id")
    return queryset.annotate(
        current_fee_status=Subquery(latest_fee.values("status")[:1]),
    )


def operator_dashboard_payload(tenant) -> dict:
    today = _today()
    flag_delayed_trips(tenant, today)
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
            status__in=[Trip.STATUS_DELAYED, Trip.STATUS_SCHEDULED],
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
    collected_via_platform = (
        FeePayment.objects.filter(tenant=tenant, paid_via="razorpay").aggregate(s=Sum("amount"))["s"]
        or Decimal("0")
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
        "collected_via_platform": str(collected_via_platform),
    }


def operator_briefing_payload(tenant, user) -> dict:
    today = _today()
    flag_delayed_trips(tenant, today)
    dashboard = operator_dashboard_payload(tenant)
    first_name = (user.first_name or user.username or "there").split()[0].title()
    weekday = today.strftime("%A")

    if dashboard["absent_students_today"] > 0:
        banner = {
            "level": "danger",
            "message": f"{dashboard['absent_students_today']} student(s) absent today — follow up with parents",
        }
    elif dashboard["late_routes"]:
        banner = {
            "level": "warning",
            "message": f"{len(dashboard['late_routes'])} route(s) delayed or not started",
        }
    else:
        banner = {"level": "safe", "message": "All routes on time"}

    trips_today = Trip.objects.filter(tenant=tenant, trip_date=today).select_related("route", "driver", "bus")
    trip_cards = []
    for trip in trips_today:
        total = TripAttendance.objects.filter(trip=trip).count()
        onboard = TripAttendance.objects.filter(trip=trip, pickup_status=TripAttendance.PRESENT).count()
        stop_count = RouteStop.objects.filter(tenant=tenant, route=trip.route).count() or 1
        marked = TripAttendance.objects.filter(trip=trip).exclude(pickup_status=TripAttendance.NOT_MARKED).count()
        stop_idx = min(marked, stop_count) if stop_count else 0
        elapsed = ""
        completed_at_display = ""
        if trip.status == Trip.STATUS_COMPLETED:
            if trip.completed_at:
                completed_at_display = timezone.localtime(trip.completed_at).strftime("%I:%M %p").lstrip("0")
        elif trip.started_at:
            mins = int((timezone.now() - trip.started_at).total_seconds() // 60)
            elapsed = f"{mins} min"
        health = _trip_health_signals(tenant, trip)
        trip_cards.append(
            {
                "id": trip.id,
                "route_name": trip.route.name,
                "driver_name": trip.driver.full_name,
                "onboard": onboard,
                "total": total,
                "stop_index": stop_idx,
                "stop_total": stop_count,
                "elapsed": elapsed,
                "completed_at_display": completed_at_display,
                "status": trip.status,
                "health": health,
            }
        )

    action_items = []
    for fee in FeeRecord.objects.filter(
        tenant=tenant,
        status=FeeRecord.STATUS_UNPAID,
        due_date__lt=today,
    ).select_related("student", "student__parent")[:10]:
        days_over = (today - fee.due_date).days
        parent_phone = fee.student.parent.phone if fee.student.parent else ""
        action_items.append(
            {
                "type": "fee",
                "id": fee.id,
                "title": f"{fee.student.full_name} — ₹{fee.amount}",
                "subtitle": f"{days_over} days overdue · {fee.month}",
                "phone": parent_phone,
            }
        )
    for att in TripAttendance.objects.filter(
        tenant=tenant,
        trip__trip_date=today,
        pickup_status=TripAttendance.ABSENT,
    ).select_related("student", "student__parent")[:10]:
        action_items.append(
            {
                "type": "absent",
                "id": att.id,
                "title": att.student.full_name,
                "subtitle": "Absent today",
                "phone": att.student.parent.phone if att.student.parent else "",
            }
        )
    for inc in Incident.objects.filter(tenant=tenant, created_at__date=today)[:5]:
        action_items.append(
            {
                "type": "incident",
                "id": inc.id,
                "title": inc.category or "Incident",
                "subtitle": inc.description[:80],
                "phone": "",
            }
        )

    return {
        "greeting": f"Good morning, {first_name}. Here's your {weekday}.",
        "banner": banner,
        "trips": trip_cards,
        "action_items": action_items,
        "dashboard": dashboard,
    }


def _route_stops_for_trip(trip: Trip) -> list[dict]:
    stops_qs = (
        RouteStop.objects.filter(tenant=trip.tenant, route=trip.route)
        .select_related("stop")
        .order_by("sequence")
    )
    marked = TripAttendance.objects.filter(
        tenant=trip.tenant,
        trip=trip,
    ).exclude(pickup_status=TripAttendance.NOT_MARKED).count()
    stop_count = stops_qs.count() or 1
    current_idx = min(marked, max(0, stop_count - 1))
    rows = []
    for i, rs in enumerate(stops_qs):
        completed = i < current_idx
        current = i == current_idx and trip.status in (
            Trip.STATUS_STARTED,
            Trip.STATUS_PICKUP_IN_PROGRESS,
        )
        rows.append(
            {
                "name": rs.stop.name,
                "completed": completed,
                "current": current,
            }
        )
    return rows


def _serialize_trip_operator(trip: Trip, *, include_stops: bool = True) -> dict:
    total = TripAttendance.objects.filter(trip=trip).count()
    onboard = TripAttendance.objects.filter(
        trip=trip, pickup_status=TripAttendance.PRESENT
    ).count()
    absent_count = TripAttendance.objects.filter(
        trip=trip, pickup_status=TripAttendance.ABSENT
    ).count()
    stops = _route_stops_for_trip(trip) if include_stops else []
    stop_count = len(stops) or 1
    current_idx = next((i for i, s in enumerate(stops) if s.get("current")), 0)
    current_name = stops[current_idx]["name"] if stops and current_idx < len(stops) else ""
    duration_minutes = None
    max_display_mins = 8 * 60
    if trip.started_at and trip.completed_at:
        duration_minutes = min(
            max_display_mins,
            int((trip.completed_at - trip.started_at).total_seconds() // 60),
        )
    elif trip.started_at:
        duration_minutes = min(
            max_display_mins,
            int((timezone.now() - trip.started_at).total_seconds() // 60),
        )
    incident_count = Incident.objects.filter(tenant=trip.tenant, trip=trip).count()
    return {
        "id": trip.id,
        "route_name": trip.route.name,
        "bus_registration": trip.bus.fleet_number,
        "driver_name": trip.driver.full_name,
        "status": trip.status,
        "started_at": trip.started_at.isoformat() if trip.started_at else None,
        "completed_at": trip.completed_at.isoformat() if trip.completed_at else None,
        "current_stop_index": current_idx,
        "total_stops": stop_count,
        "current_stop_name": current_name,
        "students_onboard": onboard,
        "total_students": total,
        "absent_count": absent_count,
        "incident_count": incident_count,
        "duration_minutes": duration_minutes,
        "stops": stops[:7],
    }


def operator_trips_today_payload(tenant) -> dict:
    today = _today()
    flag_delayed_trips(tenant, today)
    trips = list(
        Trip.objects.filter(tenant=tenant, trip_date=today)
        .select_related("route", "driver", "bus")
        .order_by("route__name")
    )
    trip_payloads = [_serialize_trip_operator(t, include_stops=True) for t in trips]
    total_students = sum(t["total_students"] for t in trip_payloads)
    absent_count = sum(t["absent_count"] for t in trip_payloads)
    durations = [t["duration_minutes"] for t in trip_payloads if t["duration_minutes"]]
    avg_duration = int(sum(durations) / len(durations)) if durations else 0
    on_time = sum(1 for t in trips if t.status != Trip.STATUS_DELAYED)
    on_time_rate = int(on_time / len(trips) * 100) if trips else 100
    return {
        "stats": {
            "total_students": total_students,
            "absent_count": absent_count,
            "avg_duration_minutes": avg_duration,
            "on_time_rate": on_time_rate,
        },
        "trips": trip_payloads,
    }


def operator_trips_by_date_payload(tenant, trip_date: date) -> dict:
    trips = list(
        Trip.objects.filter(tenant=tenant, trip_date=trip_date)
        .select_related("route", "driver", "bus")
        .order_by("route__name")
    )
    return {
        "date": str(trip_date),
        "trips": [_serialize_trip_operator(t, include_stops=False) for t in trips],
    }


def _month_bounds(month: str) -> tuple[date, date]:
    year, mon = map(int, month.split("-"))
    last = calendar.monthrange(year, mon)[1]
    return date(year, mon, 1), date(year, mon, last)


def operator_attendance_summary_payload(tenant, month: str, route_filter: str = "all") -> dict:
    start, end = _month_bounds(month)
    school_days = []
    d = start
    while d <= end:
        if d.weekday() < 5 and Trip.objects.filter(tenant=tenant, trip_date=d).exists():
            school_days.append(d)
        d += timedelta(days=1)
    dot_days = school_days[-10:]

    students_qs = Student.objects.filter(tenant=tenant).select_related(
        "assigned_route", "pickup_stop"
    )
    if route_filter != "all":
        students_qs = students_qs.filter(assigned_route_id=int(route_filter))

    students_out = []
    total_absences = 0
    rates = []
    low_students = []

    for student in students_qs.order_by("full_name"):
        dots = []
        present_count = 0
        marked_count = 0
        for day in dot_days:
            att = (
                TripAttendance.objects.filter(
                    tenant=tenant,
                    student=student,
                    trip__trip_date=day,
                )
                .select_related("trip")
                .first()
            )
            if not att:
                dots.append("no_data")
                continue
            marked_count += 1
            if att.pickup_status == TripAttendance.PRESENT:
                dots.append("present")
                present_count += 1
            elif att.pickup_status == TripAttendance.ABSENT:
                dots.append("absent")
                total_absences += 1
            else:
                dots.append("no_data")

        month_atts = TripAttendance.objects.filter(
            tenant=tenant,
            student=student,
            trip__trip_date__gte=start,
            trip__trip_date__lte=end,
        ).exclude(pickup_status=TripAttendance.NOT_MARKED)
        month_present = month_atts.filter(pickup_status=TripAttendance.PRESENT).count()
        month_total = month_atts.count()
        rate = month_present / month_total if month_total else 1.0
        rates.append(rate)
        is_low = rate < 0.75 and month_total > 0
        if is_low:
            low_students.append({"id": student.id, "name": student.full_name})
        stop_name = student.pickup_stop.name if student.pickup_stop_id else ""
        route_name = student.assigned_route.name if student.assigned_route_id else ""
        students_out.append(
            {
                "id": student.id,
                "name": student.full_name,
                "stop_name": stop_name,
                "route_name": route_name,
                "attendance_rate": round(rate, 2),
                "attendance_dots": dots,
                "is_low_attendance": is_low,
            }
        )

    students_out.sort(key=lambda s: (not s["is_low_attendance"], s["name"]))
    avg_rate = sum(rates) / len(rates) if rates else 0
    return {
        "stats": {
            "school_days": len(school_days),
            "avg_attendance_rate": round(avg_rate, 2),
            "total_absences": total_absences,
            "low_attendance_count": len(low_students),
        },
        "low_attendance_students": low_students,
        "students": students_out,
    }


def operator_attendance_export_csv(tenant, month: str, route_filter: str = "all"):
    import csv
    from io import StringIO

    start, end = _month_bounds(month)
    qs = (
        TripAttendance.objects.filter(
            tenant=tenant,
            trip__trip_date__gte=start,
            trip__trip_date__lte=end,
        )
        .select_related("student", "student__pickup_stop", "trip", "trip__route")
        .order_by("trip__trip_date", "trip__route__name", "student__full_name")
    )
    if route_filter != "all":
        qs = qs.filter(trip__route_id=int(route_filter))
    buf = StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Date", "Route", "Student", "Stop", "Pickup", "Drop", "Absent reason"])
    for att in qs:
        stop = att.student.pickup_stop.name if att.student.pickup_stop_id else ""
        writer.writerow(
            [
                str(att.trip.trip_date),
                att.trip.route.name,
                att.student.full_name,
                stop,
                att.pickup_status,
                att.drop_status,
                att.pickup_absent_reason or "",
            ]
        )
    return buf.getvalue()


def operator_fees_grouped_payload(tenant, month: str | None = None) -> dict:
    """Grouped fees with optional month filter and 3-month trend."""
    today = _today()

    def _payload_for_month(target_month: str) -> dict:
        qs = FeeRecord.objects.filter(tenant=tenant, month=target_month).select_related(
            "student", "student__parent"
        )
        overdue, due_month, paid = [], [], []
        for fr in qs.order_by("due_date"):
            row = {
                "id": fr.id,
                "student_name": fr.student.full_name,
                "month": fr.month,
                "amount": str(fr.amount),
                "due_date": str(fr.due_date),
                "status": fr.status,
                "days_overdue": max(0, (today - fr.due_date).days)
                if fr.due_date < today and fr.status != FeeRecord.STATUS_PAID
                else 0,
                "parent_phone": fr.student.parent.phone if fr.student.parent else "",
            }
            if fr.status == FeeRecord.STATUS_PAID:
                paid.append(row)
            elif fr.due_date < today and fr.status != FeeRecord.STATUS_PAID:
                overdue.append(row)
            else:
                due_month.append(row)
        collected = qs.filter(status=FeeRecord.STATUS_PAID).aggregate(s=Sum("amount"))["s"] or Decimal("0")
        pending = qs.exclude(status=FeeRecord.STATUS_PAID).aggregate(s=Sum("amount"))["s"] or Decimal("0")
        denom = collected + pending
        pct = float(collected / denom * 100) if denom else 0
        return {
            "overdue": overdue,
            "due_this_month": due_month,
            "paid": paid,
            "summary": {
                "collected": str(collected),
                "pending": str(pending),
                "collection_pct": round(pct, 1),
                "month": target_month,
            },
        }

    target = month or today.strftime("%Y-%m")
    main = _payload_for_month(target)
    trend = []
    y, m = map(int, target.split("-"))
    for i in range(2, -1, -1):
        mm = m - i
        yy = y
        while mm < 1:
            mm += 12
            yy -= 1
        ym = f"{yy}-{mm:02d}"
        p = _payload_for_month(ym)
        trend.append(
            {
                "month": ym,
                "label": date(yy, mm, 1).strftime("%B %Y"),
                "collection_pct": p["summary"]["collection_pct"],
                "collected": p["summary"]["collected"],
            }
        )
    main["trend"] = trend
    return main


def operator_notifications_unread_count(tenant) -> int:
    since = timezone.now() - timedelta(days=7)
    return OutboundMessage.objects.filter(
        tenant=tenant,
        status__in=(OutboundMessage.STATUS_PENDING, OutboundMessage.STATUS_FAILED),
        created_at__gte=since,
    ).count()


def operator_fee_remind_payload(tenant, fee_id: int) -> dict:
    fee = FeeRecord.objects.filter(tenant=tenant, pk=fee_id).select_related(
        "student", "student__parent"
    ).first()
    if fee is None:
        raise ValueError("Fee record not found")
    if fee.status == FeeRecord.STATUS_PAID:
        raise ValueError("Fee already paid")
    parent = fee.student.parent
    if parent is None or not parent.phone:
        raise ValueError("Parent phone not available")
    body = (
        f"Fee reminder for {fee.student.full_name}: ₹{fee.amount} due for {fee.month}. "
        "— Sai Baba School Bus"
    )
    message = OutboundMessage.objects.create(
        tenant=tenant,
        event_type="fee_reminder",
        to_phone=parent.phone,
        student=fee.student,
        template_key="fee_reminder",
        body=body,
        channel="whatsapp",
    )
    from .notifications.dispatch import dispatch_outbound

    message = dispatch_outbound(message)
    return {
        "status": message.status,
        "whatsapp_url": message.provider_ref if message.provider_ref.startswith("http") else "",
        "message_id": message.id,
    }
