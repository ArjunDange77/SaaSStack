from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.cosmetix.models import NavBarItem
from apps.products.pg_management.models import BedAssignment, RentRecord, Resident, Room
from apps.tenancy.models import Tenant, TenantMembership

User = get_user_model()


class Command(BaseCommand):
    help = "Seed PG demo tenant, owner membership, navigation, and sample data."

    def add_arguments(self, parser):
        parser.add_argument("--username", default="admin", help="User to grant PG membership")
        parser.add_argument("--password", default="admin", help="Password when creating user")
        parser.add_argument("--no-sample-data", action="store_true", help="Skip sample residents/rooms")

    def handle(self, *args, **options):
        tenant, _ = Tenant.objects.get_or_create(
            slug="pg-demo",
            defaults={"name": "PG Demo", "is_active": True},
        )
        self.stdout.write(self.style.SUCCESS(f"Tenant: {tenant.slug}"))

        user, created = User.objects.get_or_create(
            username=options["username"],
            defaults={"is_staff": True, "is_superuser": True},
        )
        if created:
            user.set_password(options["password"])
            user.save()
            self.stdout.write(self.style.WARNING(f"Created user {user.username}"))

        TenantMembership.objects.get_or_create(
            user=user,
            tenant=tenant,
            defaults={"role": TenantMembership.ROLE_OWNER, "is_active": True},
        )

        nav = [
            ("Dashboard", "/dashboard", "home", "", 0),
            ("Residents", "/r/pg-residents", "users", "pg-residents", 10),
            ("Rooms", "/r/pg-rooms", "building", "pg-rooms", 20),
            ("Assignments", "/r/pg-bed-assignments", "bed", "pg-bed-assignments", 30),
            ("Documents", "/r/pg-documents", "file", "pg-documents", 40),
            ("Rent", "/r/pg-rent-records", "currency", "pg-rent-records", 50),
            ("Complaints", "/r/pg-complaints", "alert", "pg-complaints", 60),
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

        if not options["no_sample_data"]:
            self._seed_sample_data(tenant, user)

        self.stdout.write(
            self.style.SUCCESS(
                f"PG seed complete. Login as {user.username}, tenant: {tenant.slug}"
            )
        )

    def _seed_sample_data(self, tenant, user):
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
                    "created_by": user,
                    "updated_by": user,
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
                    "created_by": user,
                    "updated_by": user,
                },
            )
            residents.append(r)

        if residents and rooms:
            BedAssignment.objects.get_or_create(
                tenant=tenant,
                resident=residents[0],
                room=rooms[0],
                assigned_date=date.today(),
                defaults={
                    "status": "active",
                    "created_by": user,
                    "updated_by": user,
                },
            )
            from apps.products.pg_management.services import recalculate_room_occupancy

            recalculate_room_occupancy(rooms[0])

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
                    "created_by": user,
                    "updated_by": user,
                },
            )
            RentRecord.objects.get_or_create(
                tenant=tenant,
                resident=residents[2],
                due_date=overdue,
                defaults={
                    "amount": "7500.00",
                    "paid_status": "unpaid",
                    "created_by": user,
                    "updated_by": user,
                },
            )

        self.stdout.write(self.style.SUCCESS("Sample residents, rooms, assignment, and rent seeded."))
