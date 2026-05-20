"""Base class for product seed management commands."""

from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.tenancy.models import Tenant


class ProductSeeder(BaseCommand):
    product_slug: str = ""
    default_tenant_slug: str = ""

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Wipe and recreate tenant product data")
        parser.add_argument("--dry-run", action="store_true", help="Print actions without writing")
        parser.add_argument("--tenant", default=None, help="Tenant slug")
        parser.add_argument("--months", type=int, default=3, help="Months of historical data")

    def handle(self, *args, **options):
        self.dry_run = bool(options.get("dry_run"))
        tenant_slug = options.get("tenant") or self.default_tenant_slug
        if not tenant_slug:
            self.stderr.write("Tenant slug required (--tenant or default_tenant_slug)")
            return
        self.tenant = self._get_or_create_tenant(tenant_slug)
        if options.get("reset"):
            self._reset_tenant_data()
        self.seed_data(options)
        self._print_summary()

    def seed_data(self, options):
        raise NotImplementedError

    def _get_or_create_tenant(self, slug: str) -> Tenant:
        if self.dry_run:
            self.stdout.write(f"  [dry-run] Would get_or_create Tenant slug={slug}")
            return Tenant(slug=slug, name=slug, is_active=True)
        tenant, _ = Tenant.objects.get_or_create(
            slug=slug,
            defaults={"name": slug.replace("-", " ").title(), "is_active": True},
        )
        return tenant

    def _reset_tenant_data(self):
        """Override in subclass to delete product rows for self.tenant."""

    def _print_summary(self):
        self.stdout.write(self.style.SUCCESS(f"Seed complete for tenant {self.tenant.slug}"))

    def log_create(self, model_name: str, **kwargs):
        if self.dry_run:
            self.stdout.write(f"  [dry-run] Would create {model_name}: {kwargs}")
            return None
        return kwargs

    def progress(self, label: str, current: int, total: int):
        if total <= 0:
            return
        filled = int(20 * current / total)
        bar = "█" * filled + "░" * (20 - filled)
        self.stdout.write(f"\r  {label} [{bar}] {current}/{total}", ending="")
