from django.core.management.base import BaseCommand

from apps.products.school_bus import services
from apps.tenancy.models import Tenant


class Command(BaseCommand):
    help = "Generate scheduled trips for today (weekdays, idempotent)."

    def add_arguments(self, parser):
        parser.add_argument("--tenant", help="Limit to tenant slug")
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        tenant = None
        if options.get("tenant"):
            tenant = Tenant.objects.filter(slug=options["tenant"]).first()
            if tenant is None:
                self.stderr.write(f"Unknown tenant: {options['tenant']}")
                return

        if options["dry_run"]:
            self.stdout.write("Would run generate_daily_trips for today")
            return

        count = services.generate_daily_trips(tenant=tenant)
        self.stdout.write(self.style.SUCCESS(f"Generated/verified trips for today ({count} new)"))
