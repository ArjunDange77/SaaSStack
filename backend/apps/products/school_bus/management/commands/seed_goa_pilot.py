"""
Seed Goa pilot tenant (sai-baba-school-bus) with ~3 months of realistic school-bus operations data.
"""
from __future__ import annotations

import random
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.db.models import Sum

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.cosmetix.models import NavBarItem
from apps.products.school_bus.models import (
    Bus,
    Driver,
    FeeRecord,
    FeePayment,
    Incident,
    Parent,
    Route,
    RouteStop,
    Stop,
    Student,
    TenantMessagingConfig,
    Trip,
    TripAttendance,
)
from apps.tenancy.models import Tenant, TenantMembership

User = get_user_model()

TENANT_SLUG = "sai-baba-school-bus"
TENANT_NAME = "Sai Baba School Bus Service"
# Older local seeds used this slug; cleared on --reset so pilot users bind to TENANT_SLUG.
LEGACY_TENANT_SLUGS = ("goa-bus",)
PILOT_USERNAMES = ("kamlesh", "suresh", "arun", "priya")

HOLIDAYS = {
    date(2026, 4, 14),
    date(2026, 4, 18),
    date(2026, 5, 1),
}

# Per-student target attendance rate (deterministic patterns)
STUDENT_ATTENDANCE_RATE = {
    1: 0.96,
    2: 0.95,
    3: 0.80,
    4: 0.95,
    5: 0.90,
    6: 0.75,
    7: 0.95,
    8: 0.90,
    9: 0.80,
    10: 0.95,
    11: 0.80,
    12: 0.90,
    13: 0.95,
    14: 0.75,
    15: 0.95,
}

ABSENT_REASONS = ["sick", "holiday", "no_info"]
ABSENT_REASON_WEIGHTS = [0.5, 0.3, 0.2]

INCIDENTS_SPEC = [
    (date(2026, 3, 12), "late_arrival", "low", "Traffic near Panjim bridge, arrived 12 min late"),
    (date(2026, 3, 28), "student_absent", "low", "Rahul Naik not at stop, parent not reachable"),
    (date(2026, 4, 3), "vehicle_issue", "medium", "Tyre puncture at Gurim. Waited 20 min. All students safe."),
    (date(2026, 4, 22), "late_arrival", "low", "Road blocked near Mall De Goa, 8 min delay"),
    (
        date(2026, 5, 7),
        "student_incident",
        "medium",
        "Student Aiden D'Souza fell at stop, minor knee scrape. Parents informed.",
    ),
    (date(2026, 5, 19), "late_arrival", "medium", "Bus delayed 10 minutes at Mall De Goa"),
]


def _school_days(start: date, end: date) -> list[date]:
    days = []
    d = start
    while d <= end:
        if d.weekday() < 5 and d not in HOLIDAYS:
            days.append(d)
        d += timedelta(days=1)
    return days


def _progress_bar(current: int, total: int, width: int = 20) -> str:
    if total <= 0:
        return ""
    filled = int(width * current / total)
    return "[" + "█" * filled + "░" * (width - filled) + f"] {current}/{total}"


class Command(BaseCommand):
    help = "Seed sai-baba-school-bus tenant with Goa pilot data (3 months history)."

    def add_arguments(self, parser):
        parser.add_argument("--tenant", default=TENANT_SLUG)
        parser.add_argument("--reset", action="store_true")
        parser.add_argument("--months", type=int, default=3)
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        slug = options["tenant"]
        dry_run = options["dry_run"]
        months = options["months"]
        end = timezone.localdate()
        start = end.replace(day=1) - timedelta(days=months * 31)
        start = start.replace(day=1)
        if start < date(2026, 3, 1):
            start = date(2026, 3, 1)

        if dry_run:
            days = _school_days(start, end)
            self.stdout.write(f"Would seed tenant={slug} from {start} to {end} ({len(days)} school days)")
            return

        self.stdout.write(
            f"Seeding Goa pilot tenant {slug!r} ({start} to {end}; "
            f"reset={options['reset']}) — may take several minutes on remote Postgres…"
        )

        with transaction.atomic():
            if options["reset"]:
                self._reset_tenant(slug)
                for legacy in LEGACY_TENANT_SLUGS:
                    if legacy != slug:
                        self._reset_tenant(legacy)

            tenant = self._ensure_tenant(slug)
            users = self._ensure_users(tenant)
            fleet = self._ensure_fleet(tenant, users)
            students = self._ensure_students(tenant, fleet)
            self._ensure_nav(tenant)
            TenantMessagingConfig.objects.get_or_create(tenant=tenant, defaults={"demo_mode": True})

            school_days = _school_days(start, end)
            trip_total = len(school_days) * 2
            self.stdout.write(
                f"Fleet and students ready; generating {trip_total} trips "
                f"({len(school_days)} school days × 2 routes)…"
            )
            self._generate_trips(tenant, fleet, school_days, students)
            self._generate_fees(tenant, students)
            self._sync_student_fee_status(tenant, students)
            self._generate_incidents(tenant, fleet)

        self._print_summary(slug, start, end)

    def _reset_tenant(self, slug: str) -> None:
        tenant = Tenant.objects.filter(slug=slug).first()
        if not tenant:
            return
        self.stdout.write(f"Resetting data for {slug}…")
        from apps.products.school_bus.models import OutboundMessage, TenantMessagingConfig

        OutboundMessage.objects.filter(tenant=tenant).delete()
        TenantMessagingConfig.objects.filter(tenant=tenant).delete()
        TripAttendance.objects.filter(tenant=tenant).delete()
        FeePayment.objects.filter(tenant=tenant).delete()
        FeeRecord.objects.filter(tenant=tenant).delete()
        Incident.objects.filter(tenant=tenant).delete()
        Trip.objects.filter(tenant=tenant).delete()
        Student.objects.filter(tenant=tenant).delete()
        Parent.objects.filter(tenant=tenant).delete()
        RouteStop.objects.filter(tenant=tenant).delete()
        Route.objects.filter(tenant=tenant).delete()
        Stop.objects.filter(tenant=tenant).delete()
        Driver.objects.filter(tenant=tenant).delete()
        Bus.objects.filter(tenant=tenant).delete()
        NavBarItem.objects.filter(tenant=tenant).delete()
        self.stdout.write(f"  Reset complete for {slug}.")

    def _ensure_tenant(self, slug: str) -> Tenant:
        tenant, _ = Tenant.objects.get_or_create(
            slug=slug,
            defaults={"name": TENANT_NAME, "domain": ""},
        )
        return tenant

    def _ensure_users(self, tenant: Tenant) -> dict:
        def _user(username: str, email: str, role: str, password: str = "admin"):
            u, _ = User.objects.get_or_create(username=username, defaults={"email": email})
            u.set_password(password)
            u.save()
            TenantMembership.objects.filter(
                user=u, tenant__slug__in=LEGACY_TENANT_SLUGS
            ).delete()
            TenantMembership.objects.update_or_create(
                user=u,
                tenant=tenant,
                defaults={"role": role, "is_active": True},
            )
            return u

        kamlesh = _user("kamlesh", "kamlesh@sai-baba-school-bus.test", TenantMembership.ROLE_OWNER)
        suresh_u = _user("suresh", "suresh@sai-baba-school-bus.test", TenantMembership.ROLE_STAFF)
        arun_u = _user("arun", "arun@sai-baba-school-bus.test", TenantMembership.ROLE_STAFF)
        priya_u = _user("priya", "priya@sai-baba-school-bus.test", TenantMembership.ROLE_PARENT)
        return {"kamlesh": kamlesh, "suresh": suresh_u, "arun": arun_u, "priya": priya_u}

    def _ensure_nav(self, tenant: Tenant) -> None:
        items = [
            ("Command center", "/sb/dashboard", "layout-dashboard", "", "today", 5),
            ("Today's trips", "/r/sb-trips", "bus", "sb-trips", "today", 8),
            ("Attendance", "/sb/attendance", "clipboard-list", "", "today", 10),
            ("Fees", "/sb/fees", "wallet", "", "today", 15),
            ("Notifications", "/sb/notifications", "bell", "", "today", 18),
            ("Students", "/r/sb-students", "users", "sb-students", "manage", 30),
            ("Routes", "/r/sb-routes", "route", "sb-routes", "manage", 40),
            ("Drivers", "/r/sb-drivers", "user", "sb-drivers", "manage", 50),
        ]
        for label, href, icon, resource_slug, nav_group, order in items:
            NavBarItem.objects.update_or_create(
                tenant=tenant,
                label=label,
                defaults={
                    "href": href,
                    "icon": icon,
                    "resource_slug": resource_slug,
                    "nav_group": nav_group,
                    "sort_order": order,
                    "is_active": True,
                },
            )

    def _ensure_fleet(self, tenant: Tenant, users: dict) -> dict:
        bus101, _ = Bus.objects.get_or_create(
            tenant=tenant, fleet_number="BUS-101", defaults={"capacity": 17, "active": True}
        )
        bus102, _ = Bus.objects.get_or_create(
            tenant=tenant, fleet_number="BUS-102", defaults={"capacity": 17, "active": True}
        )

        suresh, _ = Driver.objects.update_or_create(
            user=users["suresh"],
            defaults={
                "tenant": tenant,
                "full_name": "Suresh Naik",
                "phone": "+919876543210",
                "license_number": "MH-14-20180023",
                "assigned_bus": bus101,
            },
        )
        arun, _ = Driver.objects.update_or_create(
            user=users["arun"],
            defaults={
                "tenant": tenant,
                "full_name": "Arun Salgaonkar",
                "phone": "+919823456789",
                "license_number": "GA-01-20190045",
                "assigned_bus": bus102,
            },
        )

        route1, _ = Route.objects.get_or_create(
            tenant=tenant,
            name="Route 1 Morning — St. Brito's",
            defaults={
                "direction": Route.DIRECTION_MORNING,
                "active": True,
                "default_driver": suresh,
            },
        )
        route2, _ = Route.objects.get_or_create(
            tenant=tenant,
            name="Route 2 Morning — St. Xavier's",
            defaults={
                "direction": Route.DIRECTION_MORNING,
                "active": True,
                "default_driver": arun,
            },
        )
        suresh.assigned_route = route1
        suresh.save(update_fields=["assigned_route"])
        arun.assigned_route = route2
        arun.save(update_fields=["assigned_route"])

        stops_r1 = [
            ("Mall De Goa", "15.5035", "73.8154", time(7, 15)),
            ("Choga Road", "15.5102", "73.8203", time(7, 22)),
            ("Socorro Panchayat", "15.5156", "73.8267", time(7, 30)),
            ("Aradi Socorro", "15.5189", "73.8301", time(7, 38)),
            ("Sangolda", "15.5231", "73.8344", time(7, 45)),
            ("Gurim", "15.5278", "73.8389", time(7, 52)),
            ("St. Brito's School", "15.5312", "73.8421", time(8, 0)),
        ]
        stop_objs_r1 = []
        for i, (name, lat, lng, eta) in enumerate(stops_r1, start=1):
            stop, _ = Stop.objects.get_or_create(
                tenant=tenant,
                name=name,
                defaults={
                    "address": f"{name}, Goa",
                    "latitude": Decimal(lat),
                    "longitude": Decimal(lng),
                },
            )
            RouteStop.objects.get_or_create(
                tenant=tenant,
                route=route1,
                stop=stop,
                defaults={"sequence": i, "estimated_time": eta},
            )
            stop_objs_r1.append(stop)

        stops_r2_names = ["Mall De Goa", "Choga Road", "Sangolda", "St. Xavier's College"]
        stop_objs_r2 = []
        seq = 1
        for name in stops_r2_names:
            stop = Stop.objects.filter(tenant=tenant, name=name).first()
            if not stop:
                stop = Stop.objects.create(tenant=tenant, name=name, address=f"{name}, Goa")
            RouteStop.objects.get_or_create(
                tenant=tenant,
                route=route2,
                stop=stop,
                defaults={"sequence": seq, "estimated_time": time(7, 15 + seq * 7)},
            )
            stop_objs_r2.append(stop)
            seq += 1

        return {
            "bus101": bus101,
            "bus102": bus102,
            "route1": route1,
            "route2": route2,
            "suresh": suresh,
            "arun": arun,
            "stop_r1": stop_objs_r1,
        }

    def _ensure_students(self, tenant: Tenant, fleet: dict) -> list[Student]:
        parents_data = [
            ("Priya Naik", "+919823001001", "priya"),
            ("Rohan Fernandes", "+919823001002", None),
            ("Anita D'Souza", "+919823001003", None),
            ("Deepak Shetty", "+919823001004", None),
            ("Leena Coutinho", "+919823001005", None),
            ("Vinod Gaonkar", "+919823001006", None),
            ("Sunita Borkar", "+919823001007", None),
            ("Mahesh Velip", "+919823001008", None),
            ("Rekha Sawant", "+919823001009", None),
            ("Anil Dessai", "+919823001010", None),
        ]
        parent_by_idx = {}
        users = {u.username: u for u in User.objects.filter(username__in=["priya"])}
        for i, (name, phone, user_key) in enumerate(parents_data, start=1):
            user = users.get(user_key) if user_key else None
            if user:
                p, _ = Parent.objects.update_or_create(
                    user=user,
                    defaults={"tenant": tenant, "full_name": name, "phone": phone},
                )
            else:
                p, _ = Parent.objects.update_or_create(
                    tenant=tenant,
                    full_name=name,
                    defaults={"phone": phone},
                )
            parent_by_idx[i] = p

        # parent index mapping for students
        parent_map = {1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 1, 7: 6, 8: 7, 9: 8, 10: 9, 11: 3, 12: 5, 13: 10, 14: 8, 15: 10}

        students_spec = [
            (1, "Rahul Naik", "5", 1, "BUS-101", 0, 1),
            (2, "Sneha Fernandes", "3", 1, "BUS-101", 1, 2),
            (3, "Aiden D'Souza", "7", 1, "BUS-101", 2, 3),
            (4, "Pooja Shetty", "4", 1, "BUS-101", 3, 4),
            (5, "Kevin Coutinho", "6", 1, "BUS-101", 4, 5),
            (6, "Rina Naik", "2", 1, "BUS-101", 0, 1),
            (7, "Amit Gaonkar", "8", 1, "BUS-101", 1, 6),
            (8, "Divya Borkar", "5", 1, "BUS-101", 2, 7),
            (9, "Raj Velip", "3", 1, "BUS-101", 3, 8),
            (10, "Prerna Sawant", "7", 1, "BUS-101", 4, 9),
            (11, "Liam D'Souza", "4", 1, "BUS-101", 2, 3),
            (12, "Maya Coutinho", "6", 1, "BUS-101", 4, 5),
            (13, "Riya Dessai", "2", 2, "BUS-102", 1, 10),
            (14, "Vihaan Velip", "8", 2, "BUS-102", 2, 8),
            (15, "Noah Dessai", "5", 2, "BUS-102", 5, 10),
        ]

        bus = {"BUS-101": fleet["bus101"], "BUS-102": fleet["bus102"]}
        route = {1: fleet["route1"], 2: fleet["route2"]}
        stops = fleet["stop_r1"]

        students: list[tuple[int, Student]] = []
        for sid, name, grade, rid, bnum, stop_idx, pidx in students_spec:
            pickup = stops[stop_idx] if rid == 1 else stops[min(stop_idx, len(stops) - 1)]
            s, _ = Student.objects.update_or_create(
                tenant=tenant,
                full_name=name,
                defaults={
                    "school_name": "St. Brito's School" if rid == 1 else "St. Xavier's College",
                    "class_grade": f"Grade {grade}",
                    "pickup_stop": pickup,
                    "drop_stop": pickup,
                    "assigned_route": route[rid],
                    "assigned_bus": bus[bnum],
                    "parent": parent_by_idx[parent_map[sid]],
                    "fee_status": Student.FEE_UNPAID,
                },
            )
            students.append((sid, s))
        return students

    def _generate_trips(self, tenant: Tenant, fleet: dict, school_days: list[date], students: list) -> int:
        routes = [
            (fleet["route1"], fleet["bus101"], fleet["suresh"]),
            (fleet["route2"], fleet["bus102"], fleet["arun"]),
        ]
        total = len(school_days) * len(routes)
        created = 0
        n = 0
        today = timezone.localdate()

        for trip_date in school_days:
            for route, bus, driver in routes:
                n += 1
                if n == 1 or n % 5 == 0 or n == total:
                    self.stdout.write(f"Creating trips… {_progress_bar(n, total)}")

                rng = random.Random(trip_date.toordinal() + route.id)
                roll = rng.random()
                if roll < 0.02:
                    status = Trip.STATUS_SCHEDULED
                    started_at = None
                    completed_at = None
                elif roll < 0.05:
                    status = Trip.STATUS_DELAYED
                    started_at = None
                    completed_at = None
                else:
                    status = Trip.STATUS_COMPLETED
                    hour = 6 + rng.randint(40, 55) // 10
                    minute = rng.randint(0, 59)
                    started_at = timezone.make_aware(datetime.combine(trip_date, time(hour, minute)))
                    completed_at = started_at + timedelta(minutes=rng.randint(45, 75))

                if trip_date == today and status == Trip.STATUS_COMPLETED:
                    status = Trip.STATUS_PICKUP_IN_PROGRESS
                    started_at = timezone.now() - timedelta(minutes=12)
                    completed_at = None

                trip, _ = Trip.objects.get_or_create(
                    tenant=tenant,
                    route=route,
                    bus=bus,
                    driver=driver,
                    trip_date=trip_date,
                    defaults={"status": status, "started_at": started_at, "completed_at": completed_at},
                )
                if trip.status != status:
                    trip.status = status
                    trip.started_at = started_at
                    trip.completed_at = completed_at
                    trip.save()

                marked_at = started_at or timezone.now()
                attendance_rows: list[TripAttendance] = []
                for sid, student in students:
                    if student.assigned_route_id != route.id:
                        continue
                    att_rate = STUDENT_ATTENDANCE_RATE.get(sid, 0.88)
                    srng = random.Random(sid * 1000 + trip_date.toordinal())
                    present = srng.random() < att_rate
                    pickup = TripAttendance.PRESENT if present else TripAttendance.ABSENT
                    drop = TripAttendance.PRESENT if present else TripAttendance.NOT_MARKED
                    absent_reason = ""
                    if not present:
                        absent_reason = srng.choices(ABSENT_REASONS, weights=ABSENT_REASON_WEIGHTS)[0]

                    attendance_rows.append(
                        TripAttendance(
                            tenant=tenant,
                            trip=trip,
                            student=student,
                            pickup_status=pickup,
                            drop_status=drop,
                            pickup_absent_reason=absent_reason,
                            marked_at=marked_at,
                        )
                    )
                if attendance_rows:
                    TripAttendance.objects.bulk_create(attendance_rows, batch_size=200)
                created += 1
        return created

    def _generate_fees(self, tenant: Tenant, students: list) -> None:
        amount = Decimal("2500.00")
        for sid, student in students:
            # March — all paid
            rec_mar, _ = FeeRecord.objects.get_or_create(
                tenant=tenant,
                student=student,
                month="2026-03",
                defaults={
                    "amount": amount,
                    "due_date": date(2026, 3, 14),
                    "status": FeeRecord.STATUS_PAID,
                },
            )
            if rec_mar.status != FeeRecord.STATUS_PAID:
                rec_mar.status = FeeRecord.STATUS_PAID
                rec_mar.save()
            FeePayment.objects.get_or_create(
                tenant=tenant,
                fee_record=rec_mar,
                amount=amount,
                defaults={"note": "March fee"},
            )

            # April — last 5 students unpaid
            unpaid_april = sid >= 11
            rec_apr, _ = FeeRecord.objects.get_or_create(
                tenant=tenant,
                student=student,
                month="2026-04",
                defaults={
                    "amount": amount,
                    "due_date": date(2026, 4, 14),
                    "status": FeeRecord.STATUS_UNPAID if unpaid_april else FeeRecord.STATUS_PAID,
                },
            )
            if not unpaid_april and rec_apr.status != FeeRecord.STATUS_PAID:
                FeePayment.objects.get_or_create(
                    tenant=tenant,
                    fee_record=rec_apr,
                    amount=amount,
                    defaults={"note": "April fee"},
                )

            FeeRecord.objects.get_or_create(
                tenant=tenant,
                student=student,
                month="2026-05",
                defaults={
                    "amount": amount,
                    "due_date": date(2026, 5, 25),
                    "status": FeeRecord.STATUS_UNPAID,
                },
            )

    def _sync_student_fee_status(self, tenant: Tenant, students: list) -> None:
        current_month = timezone.localdate().strftime("%Y-%m")
        for _, student in students:
            fr = FeeRecord.objects.filter(
                tenant=tenant, student=student, month=current_month
            ).first()
            if fr and student.fee_status != fr.status:
                student.fee_status = fr.status
                student.save(update_fields=["fee_status"])

    def _generate_incidents(self, tenant: Tenant, fleet: dict) -> None:
        route1 = fleet["route1"]
        suresh = fleet["suresh"]
        for trip_date, category, severity, description in INCIDENTS_SPEC:
            trip = Trip.objects.filter(tenant=tenant, route=route1, trip_date=trip_date).first()
            Incident.objects.get_or_create(
                tenant=tenant,
                trip=trip,
                description=description,
                defaults={
                    "category": category,
                    "severity": severity,
                    "reported_by": suresh.user,
                },
            )

    def _print_summary(self, slug: str, start: date, end: date) -> None:
        tenant = Tenant.objects.get(slug=slug)
        trips = Trip.objects.filter(tenant=tenant, trip_date__gte=start, trip_date__lte=end)
        trip_count = trips.count()
        att_total = TripAttendance.objects.filter(tenant=tenant, trip__in=trips).count()
        present = TripAttendance.objects.filter(
            tenant=tenant, trip__in=trips, pickup_status=TripAttendance.PRESENT
        ).count()
        rate = (present / att_total * 100) if att_total else 0
        collected = FeePayment.objects.filter(tenant=tenant).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        pending = FeeRecord.objects.filter(tenant=tenant, status=FeeRecord.STATUS_UNPAID).count()
        pending_amt = (
            FeeRecord.objects.filter(tenant=tenant, status=FeeRecord.STATUS_UNPAID).aggregate(
                total=Sum("amount")
            )["total"]
            or Decimal("0")
        )
        incidents = Incident.objects.filter(tenant=tenant).count()

        self.stdout.write(self.style.SUCCESS(f"\nGoa pilot seed complete for {slug}"))
        self.stdout.write(f"  School days range: {start} → {end}")
        self.stdout.write(f"  Trips: {trip_count}")
        self.stdout.write(f"  Attendance records: {att_total} ({rate:.1f}% present)")
        self.stdout.write(f"  Collected (all time): ₹{collected}")
        self.stdout.write(f"  Unpaid fee records: {pending} (₹{pending_amt})")
        self.stdout.write(f"  Incidents: {incidents}")
        self.stdout.write(
            "  Logins: kamlesh / suresh / priya — password: admin — tenant: sai-baba-school-bus"
        )
