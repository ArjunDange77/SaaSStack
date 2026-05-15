from django.core.management.base import BaseCommand

from apps.cosmetix.models import Branding, NavBarItem
from apps.tenancy.models import Tenant


class Command(BaseCommand):
    help = "Seed default tenant, branding, and navigation for local kernel development."

    def handle(self, *args, **options):
        tenant, _ = Tenant.objects.get_or_create(
            slug="demo",
            defaults={"name": "Demo Tenant", "is_active": True},
        )
        self.stdout.write(self.style.SUCCESS(f"Tenant: {tenant.slug}"))

        Branding.objects.get_or_create(
            tenant=None,
            name="default",
            defaults={
                "logo_url": "",
                "css_vars": {"--brand-primary": "#2563eb"},
                "is_active": True,
            },
        )

        items = [
            ("Home", "/", "home", "", 0),
            ("Demo catalog", "/r/demo-items", "list", "demo-items", 10),
        ]
        for label, href, icon, resource_slug, order in items:
            NavBarItem.objects.get_or_create(
                tenant=None,
                label=label,
                defaults={
                    "href": href,
                    "icon": icon,
                    "resource_slug": resource_slug,
                    "sort_order": order,
                    "is_active": True,
                },
            )

        self.stdout.write(self.style.SUCCESS("Kernel seed complete. Use X-Tenant: demo on API requests."))
