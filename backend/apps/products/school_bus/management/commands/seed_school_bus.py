from datetime import date, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.products.school_bus.models import (
    Bus,
    Driver,
    FeeRecord,
    Incident,
    Parent,
    Reminder,
    Route,
    RouteStop,
    Stop,
    Student,
    Trip,
    TripAttendance,
)
from apps.products.school_bus import services
from apps.cosmetix.models import NavBarItem
from apps.tenancy.models import Tenant, TenantMembership

User = get_user_model()


class Command(BaseCommand):
    help = "Seed School Bus demo tenant (sb-demo) with morning-operations scenario."

    def handle(self, *args, **options):
        tenant, _ = Tenant.objects.get_or_create(
            slug="sb-demo",
            defaults={"name": "School Bus Demo District", "domain": ""},
        )

        operator, _ = User.objects.get_or_create(
            username="sb-operator",
            defaults={"email": "operator@sb-demo.test"},
        )
        operator.set_password("admin")
        operator.save()
        TenantMembership.objects.get_or_create(
            user=operator,
            tenant=tenant,
            defaults={"role": TenantMembership.ROLE_OWNER},
        )

        driver_user, _ = User.objects.get_or_create(
            username="sb-driver",
            defaults={"email": "driver@sb-demo.test"},
        )
        driver_user.set_password("admin")
        driver_user.save()
        TenantMembership.objects.get_or_create(
            user=driver_user,
            tenant=tenant,
            defaults={"role": TenantMembership.ROLE_STAFF},
        )

        parent_user, _ = User.objects.get_or_create(
            username="sb-parent",
            defaults={"email": "parent@sb-demo.test"},
        )
        parent_user.set_password("admin")
        parent_user.save()
        TenantMembership.objects.get_or_create(
            user=parent_user,
            tenant=tenant,
            defaults={"role": TenantMembership.ROLE_PARENT},
        )

        nav = [
            ("Command center", "/sb/dashboard", "layout-dashboard", "", "core", 5),
            ("Attendance", "/sb/attendance", "clipboard-list", "", "operations", 8),
            ("Students", "/r/sb-students", "users", "sb-students", "operations", 10),
            ("Routes", "/r/sb-routes", "route", "sb-routes", "operations", 20),
            ("Drivers", "/r/sb-drivers", "user", "sb-drivers", "operations", 30),
            ("Trips", "/r/sb-trips", "bus", "sb-trips", "operations", 40),
            ("Fees", "/r/sb-fee-records", "wallet", "sb-fee-records", "operations", 50),
        ]
        for label, href, icon, resource_slug, nav_group, order in nav:
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

        bus, _ = Bus.objects.get_or_create(
            tenant=tenant,
            fleet_number="BUS-101",
            defaults={"capacity": 48},
        )

        morning_route, _ = Route.objects.get_or_create(
            tenant=tenant,
            name="North Campus Morning",
            defaults={
                "description": "Morning pickup loop",
                "direction": Route.DIRECTION_MORNING,
            },
        )
        Route.objects.get_or_create(
            tenant=tenant,
            name="South Campus Evening",
            defaults={
                "description": "Evening drop loop",
                "direction": Route.DIRECTION_EVENING,
            },
        )

        stops = []
        for i, name in enumerate(
            ["Maple Stop", "Oak Avenue", "Central School Gate", "River View", "Hill Park"],
            start=1,
        ):
            stop, _ = Stop.objects.get_or_create(
                tenant=tenant,
                name=name,
                defaults={"address": f"{i}00 Demo Street"},
            )
            stops.append(stop)

        for seq, stop in enumerate(stops, start=1):
            RouteStop.objects.get_or_create(
                tenant=tenant,
                route=morning_route,
                stop=stop,
                defaults={
                    "sequence": seq,
                    "estimated_time": time(7, 0 + seq * 10),
                },
            )

        driver, _ = Driver.objects.get_or_create(
            tenant=tenant,
            full_name="Alex Driver",
            defaults={
                "phone": "+910000000001",
                "license_number": "SB-DL-001",
                "emergency_contact": "Emergency Contact 1",
                "joining_date": date.today() - timedelta(days=365),
                "status": Driver.STATUS_ACTIVE,
                "assigned_bus": bus,
                "assigned_route": morning_route,
                "user": driver_user,
            },
        )
        if driver.user_id is None:
            driver.user = driver_user
            driver.assigned_bus = bus
            driver.assigned_route = morning_route
            driver.save()

        morning_route.default_driver = driver
        morning_route.save(update_fields=["default_driver"])

        portal_parent, _ = Parent.objects.get_or_create(
            tenant=tenant,
            full_name="Priya Sharma",
            defaults={"phone": "+910000000099", "email": "parent@sb-demo.test", "user": parent_user},
        )
        if portal_parent.user_id is None:
            portal_parent.user = parent_user
            portal_parent.save()

        parents = [portal_parent]
        for i in range(2, 6):
            p, _ = Parent.objects.get_or_create(
                tenant=tenant,
                full_name=f"Parent {i}",
                defaults={"phone": f"+9100000000{i:02d}"},
            )
            parents.append(p)

        students = []
        for i in range(1, 16):
            parent = parents[(i - 1) % len(parents)]
            stop = stops[(i - 1) % len(stops)]
            student, _ = Student.objects.get_or_create(
                tenant=tenant,
                full_name=f"Student {i:02d}",
                defaults={
                    "school_name": "Demo Public School",
                    "class_grade": f"Grade {((i - 1) % 6) + 1}",
                    "pickup_stop": stop,
                    "drop_stop": stop,
                    "assigned_route": morning_route,
                    "assigned_bus": bus,
                    "parent": parent,
                    "fee_status": Student.FEE_UNPAID if i % 3 == 0 else Student.FEE_PAID,
                },
            )
            students.append(student)

        today = timezone.localdate()
        trip = services.ensure_trip_for_driver(tenant, driver, today)
        trip.status = Trip.STATUS_PICKUP_IN_PROGRESS
        trip.started_at = timezone.now()
        trip.save(update_fields=["status", "started_at", "updated_at"])

        for idx, student in enumerate(students):
            att = TripAttendance.objects.get(tenant=tenant, trip=trip, student=student)
            if idx % 5 == 0:
                att.pickup_status = TripAttendance.ABSENT
            else:
                att.pickup_status = TripAttendance.PRESENT
            att.save(update_fields=["pickup_status", "updated_at"])

        month = today.strftime("%Y-%m")
        for i, student in enumerate(students[:5]):
            fee, _ = FeeRecord.objects.get_or_create(
                tenant=tenant,
                student=student,
                month=month,
                defaults={
                    "amount": Decimal("2500.00"),
                    "due_date": today - timedelta(days=5 if i < 3 else 20),
                    "status": FeeRecord.STATUS_UNPAID if i < 3 else FeeRecord.STATUS_PAID,
                },
            )
            if i >= 3:
                services.record_fee_payment(fee, fee.amount, note="Seed payment")

        Incident.objects.get_or_create(
            tenant=tenant,
            student=students[0],
            trip=trip,
            defaults={
                "severity": Incident.SEVERITY_MEDIUM,
                "category": "late_arrival",
                "description": "Bus delayed 10 minutes at Maple Stop.",
                "reported_by": driver_user,
            },
        )

        services.broadcast_reminder(
            tenant,
            kind=Reminder.KIND_FEE_DUE,
            title="Transport fee due",
            body="Please clear pending transport fees for this month.",
        )
        Reminder.objects.get_or_create(
            tenant=tenant,
            parent=portal_parent,
            kind=Reminder.KIND_INCIDENT,
            title="Route delay notice",
            defaults={
                "audience": Reminder.AUDIENCE_PARENT,
                "body": "Morning route ran 10 minutes late today.",
            },
        )

        self.stdout.write(
            self.style.SUCCESS(
                "School Bus demo seeded (sb-demo). Logins: sb-operator/admin, sb-driver/admin, sb-parent/admin"
            )
        )
