from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.products.school_bus.models import FeeRecord, Student
from apps.tenancy.models import Tenant


class Command(BaseCommand):
    help = "Create monthly FeeRecord rows for all students in a tenant (manual billing)."

    def add_arguments(self, parser):
        parser.add_argument("--tenant", default="sb-demo", help="Tenant slug")
        parser.add_argument(
            "--month",
            help="Billing month YYYY-MM (default: current month)",
        )
        parser.add_argument(
            "--amount",
            type=str,
            default="2500.00",
            help="Fee amount per student",
        )
        parser.add_argument(
            "--due-day",
            type=int,
            default=14,
            help="Due day of month (1-28)",
        )

    def handle(self, *args, **options):
        slug = options["tenant"]
        tenant = Tenant.objects.filter(slug=slug).first()
        if tenant is None:
            self.stderr.write(f"Tenant not found: {slug}")
            return

        today = timezone.localdate()
        month = options["month"] or today.strftime("%Y-%m")
        amount = Decimal(options["amount"])
        due_day = max(1, min(28, int(options["due_day"])))
        year_s, month_s = month.split("-")
        due_date = date(int(year_s), int(month_s), due_day)

        created = 0
        for student in Student.objects.filter(tenant=tenant):
            _, was_created = FeeRecord.objects.get_or_create(
                tenant=tenant,
                student=student,
                month=month,
                defaults={
                    "amount": amount,
                    "due_date": due_date,
                    "status": FeeRecord.STATUS_UNPAID,
                },
            )
            if was_created:
                created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Monthly fees for {slug} ({month}): {created} new records, "
                f"due {due_date}, ₹{amount} each"
            )
        )
