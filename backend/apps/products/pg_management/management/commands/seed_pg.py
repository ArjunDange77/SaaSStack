from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.cosmetix.models import NavBarItem
from apps.products.pg_management.models import (
    BedAssignment,
    BookingRequest,
    Complaint,
    RentRecord,
    Resident,
    Room,
)
from apps.products.pg_management.services import recalculate_room_occupancy
from apps.tenancy.models import Tenant, TenantMembership

User = get_user_model()


class Command(BaseCommand):
    help = "Seed PG demo tenant, owner/staff/resident users, navigation, and sample data."

    def add_arguments(self, parser):
        parser.add_argument("--username", default="admin", help="Owner username")
        parser.add_argument("--password", default="admin", help="Password when creating users")
        parser.add_argument("--no-sample-data", action="store_true", help="Skip sample residents/rooms")
        parser.add_argument(
            "--demo",
            action="store_true",
            help="Alias for full demo dataset (sample data on pg-demo tenant)",
        )

    def handle(self, *args, **options):
        tenant, _ = Tenant.objects.get_or_create(
            slug="pg-demo",
            defaults={"name": "PG Demo", "is_active": True},
        )
        self.stdout.write(self.style.SUCCESS(f"Tenant: {tenant.slug}"))

        password = options["password"]
        owner, _ = self._ensure_user("owner", password, options["username"])
        staff, _ = self._ensure_user("staff", password, "staff")
        resident_user, _ = self._ensure_user("resident", password, "resident")

        for user, role in [
            (owner, TenantMembership.ROLE_OWNER),
            (staff, TenantMembership.ROLE_STAFF),
            (resident_user, TenantMembership.ROLE_RESIDENT),
        ]:
            TenantMembership.objects.get_or_create(
                user=user,
                tenant=tenant,
                defaults={"role": role, "is_active": True},
            )

        nav = [
            ("Dashboard", "/dashboard", "home", "", 0),
            ("Residents", "/r/pg-residents", "users", "pg-residents", 10),
            ("Rooms", "/r/pg-rooms", "building", "pg-rooms", 20),
            ("Assignments", "/r/pg-bed-assignments", "bed", "pg-bed-assignments", 30),
            ("Documents", "/r/pg-documents", "file", "pg-documents", 40),
            ("Rent", "/r/pg-rent-records", "currency", "pg-rent-records", 50),
            ("Complaints", "/r/pg-complaints", "alert", "pg-complaints", 60),
            ("Bookings", "/r/pg-booking-requests", "calendar", "pg-booking-requests", 70),
        ]
        for label, href, icon, resource_slug, order in nav:
            NavBarItem.objects.get_or_create(
                tenant=tenant,
                label=label,
                defaults={
                    "href": href,
                    "icon": icon,
                    "resource_slug": resource_slug,
                    "sort_order": order,
                    "is_active": True,
                },
            )

        if options["demo"] or not options["no_sample_data"]:
            self._seed_sample_data(tenant, owner, resident_user)

        self.stdout.write(
            self.style.SUCCESS(
                "PG seed complete. Users: owner/admin, staff/staff, resident/resident — "
                f"tenant {tenant.slug}. Public booking: /book/pg-demo"
            )
        )

    def _ensure_user(self, role_name, password, username):
        user, created = User.objects.get_or_create(
            username=username,
            defaults={"is_staff": role_name == "owner"},
        )
        user.set_password(password)
        if role_name == "owner":
            user.is_superuser = True
            user.is_staff = True
        user.save()
        return user, created

    def _seed_sample_data(self, tenant, owner, resident_user):
        rooms_data = [
            ("101", "1", 2),
            ("102", "1", 2),
            ("201", "2", 1),
            ("202", "2", 1),
        ]
        rooms = []
        for num, floor, limit in rooms_data:
            room, _ = Room.objects.get_or_create(
                tenant=tenant,
                room_number=num,
                defaults={
                    "floor": floor,
                    "occupancy_limit": limit,
                    "room_status": "available",
                    "created_by": owner,
                    "updated_by": owner,
                },
            )
            rooms.append(room)

        residents_data = [
            ("Priya Sharma", "9000000001"),
            ("Rahul Verma", "9000000002"),
            ("Anita Desai", "9000000003"),
            ("Vikram Singh", "9000000004"),
        ]
        residents = []
        for name, phone in residents_data:
            r, _ = Resident.objects.get_or_create(
                tenant=tenant,
                phone=phone,
                defaults={
                    "full_name": name,
                    "onboarding_status": "completed",
                    "active_status": "active",
                    "created_by": owner,
                    "updated_by": owner,
                },
            )
            residents.append(r)

        portal_resident, _ = Resident.objects.get_or_create(
            tenant=tenant,
            phone="9000000099",
            defaults={
                "full_name": "Demo Resident",
                "onboarding_status": "completed",
                "active_status": "active",
                "created_by": owner,
                "updated_by": owner,
            },
        )
        if portal_resident.user_id != resident_user.pk:
            portal_resident.user = resident_user
            portal_resident.save(update_fields=["user"])

        if residents and rooms:
            BedAssignment.objects.get_or_create(
                tenant=tenant,
                resident=residents[0],
                room=rooms[0],
                assigned_date=date.today(),
                defaults={
                    "status": "active",
                    "created_by": owner,
                    "updated_by": owner,
                },
            )
            recalculate_room_occupancy(rooms[0])

            if portal_resident.active_status == "active" and len(rooms) > 1:
                BedAssignment.objects.get_or_create(
                    tenant=tenant,
                    resident=portal_resident,
                    room=rooms[1],
                    assigned_date=date.today(),
                    defaults={
                        "status": "active",
                        "created_by": owner,
                        "updated_by": owner,
                    },
                )
                recalculate_room_occupancy(rooms[1])

        due = date.today() + timedelta(days=5)
        overdue = date.today() - timedelta(days=10)
        if len(residents) >= 2:
            RentRecord.objects.get_or_create(
                tenant=tenant,
                resident=residents[1],
                due_date=due,
                defaults={
                    "amount": "8000.00",
                    "paid_status": "unpaid",
                    "created_by": owner,
                    "updated_by": owner,
                },
            )
            RentRecord.objects.get_or_create(
                tenant=tenant,
                resident=residents[2],
                due_date=overdue,
                defaults={
                    "amount": "7500.00",
                    "paid_status": "unpaid",
                    "created_by": owner,
                    "updated_by": owner,
                },
            )
            RentRecord.objects.get_or_create(
                tenant=tenant,
                resident=portal_resident,
                due_date=due,
                defaults={
                    "amount": "6500.00",
                    "paid_status": "unpaid",
                    "created_by": owner,
                    "updated_by": owner,
                },
            )

        if len(residents) >= 1:
            Complaint.objects.get_or_create(
                tenant=tenant,
                resident=residents[0],
                title="Water heater not working",
                defaults={
                    "description": "No hot water on floor 1 since morning.",
                    "priority": "high",
                    "status": "open",
                    "created_by": owner,
                    "updated_by": owner,
                },
            )

        BookingRequest.objects.get_or_create(
            tenant=tenant,
            phone="9000008888",
            full_name="Visitor Demo",
            defaults={
                "duration": "6 months",
                "status": "pending",
                "preferred_room": rooms[2] if len(rooms) > 2 else None,
                "created_by": owner,
                "updated_by": owner,
            },
        )

        self.stdout.write(
            self.style.SUCCESS(
                "Demo data: rooms, residents, assignment, overdue rent, open complaint, pending booking."
            )
        )
