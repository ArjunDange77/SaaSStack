from __future__ import annotations

import calendar
from datetime import date
from decimal import Decimal

from django.db.models import Q, Sum
from django.utils import timezone

from apps.registry.activity import log_activity

from .models import (
    Bus,
    Driver,
    FeeRecord,
    FeePayment,
    Incident,
    Parent,
    Reminder,
    RouteStop,
    Student,
    Trip,
    TripAttendance,
    TripLocation,
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
        if record.pickup_status == TripAttendance.PRESENT:
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
    loc = TripLocation.objects.filter(tenant=tenant, trip=trip).order_by("-recorded_at").first()
    return {
        "trip_id": trip.id,
        "trip_status": trip.status,
        "trip_date": str(trip.trip_date),
        "started_at": trip.started_at.isoformat() if trip.started_at else None,
        "route": {"id": trip.route_id, "name": trip.route.name, "direction": trip.route.direction},
        "bus": {"id": trip.bus_id, "fleet_number": trip.bus.fleet_number},
        "checklist": checklist,
        "last_location": (
            {"latitude": str(loc.latitude), "longitude": str(loc.longitude), "recorded_at": loc.recorded_at.isoformat()}
            if loc
            else None
        ),
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
        t = att.marked_at.strftime("%I:%M %p") if att.marked_at else ""
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
        if trip.started_at:
            mins = int((timezone.now() - trip.started_at).total_seconds() // 60)
            elapsed = f"{mins} min"
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
                "status": trip.status,
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


def operator_fees_grouped_payload(tenant) -> dict:
    today = _today()
    qs = FeeRecord.objects.filter(tenant=tenant).select_related("student", "student__parent")
    overdue, due_month, paid = [], [], []
    for fr in qs.order_by("due_date"):
        row = {
            "id": fr.id,
            "student_name": fr.student.full_name,
            "month": fr.month,
            "amount": str(fr.amount),
            "due_date": str(fr.due_date),
            "status": fr.status,
            "days_overdue": max(0, (today - fr.due_date).days) if fr.due_date < today else 0,
            "parent_phone": fr.student.parent.phone if fr.student.parent else "",
        }
        if fr.status == FeeRecord.STATUS_PAID:
            paid.append(row)
        elif fr.due_date < today and fr.status != FeeRecord.STATUS_PAID:
            overdue.append(row)
        else:
            due_month.append(row)
    total_collected = FeePayment.objects.filter(tenant=tenant).aggregate(s=Sum("amount"))["s"] or Decimal("0")
    pending = qs.filter(status__in=[FeeRecord.STATUS_UNPAID, FeeRecord.STATUS_PARTIAL]).aggregate(
        s=Sum("amount")
    )["s"] or Decimal("0")
    paid_amt = qs.filter(status=FeeRecord.STATUS_PAID).aggregate(s=Sum("amount"))["s"] or Decimal("0")
    denom = total_collected + pending
    pct = float(paid_amt / denom * 100) if denom else 0
    return {
        "overdue": overdue,
        "due_this_month": due_month,
        "paid": paid,
        "summary": {
            "collected": str(total_collected),
            "pending": str(pending),
            "collection_pct": round(pct, 1),
        },
    }
