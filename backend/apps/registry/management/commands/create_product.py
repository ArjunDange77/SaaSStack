"""
Scaffold a new product vertical.

Usage: python manage.py create_product hostel
       python manage.py create_product clinic --dry-run
"""

from __future__ import annotations

import re
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

BACKEND_ROOT = Path(settings.BASE_DIR) / "apps" / "products"
FRONTEND_ROOT = Path(settings.BASE_DIR).parent / "frontend" / "src"


def _slug_to_class(slug: str) -> str:
    return "".join(part.capitalize() for part in re.split(r"[-_]", slug))


class Command(BaseCommand):
    help = "Scaffold apps/products/<slug> and frontend/src/products/<slug>"

    def add_arguments(self, parser):
        parser.add_argument("slug", help="Product slug, e.g. hostel")
        parser.add_argument("--dry-run", action="store_true", help="Print files only")
        parser.add_argument("--force", action="store_true", help="Overwrite existing scaffold")

    def handle(self, *args, **options):
        slug = options["slug"].strip().lower().replace(" ", "_")
        if not re.match(r"^[a-z][a-z0-9_]*$", slug):
            raise CommandError("Invalid slug — use lowercase letters, numbers, underscores")
        prefix = slug.replace("_", "-")[:6]
        class_name = _slug_to_class(slug)
        product_dir = BACKEND_ROOT / slug
        if product_dir.exists() and not options["force"]:
            raise CommandError(f"{product_dir} exists — use --force to overwrite")

        files = self._templates(slug, prefix, class_name)
        if options["dry_run"]:
            for rel in files:
                self.stdout.write(f"Would write: {rel}")
            return

        product_dir.mkdir(parents=True, exist_ok=True)
        for rel, content in files.items():
            path = Path(settings.BASE_DIR) / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
            self.stdout.write(f"Created {path.relative_to(settings.BASE_DIR.parent)}")

        fe_dir = FRONTEND_ROOT / "products" / slug
        fe_dir.mkdir(parents=True, exist_ok=True)
        (fe_dir / "config.ts").write_text(self._frontend_config(slug, prefix), encoding="utf-8")
        self.stdout.write(self.style.WARNING(
            f"\nNext steps:\n"
            f"  1. Add 'apps.products.{slug}' to INSTALLED_APPS in config/settings/base.py\n"
            f"  2. Add path('api/{prefix}/', include('apps.products.{slug}.urls')) to config/urls.py\n"
            f"  3. Register ProductConfig in apps.products.{slug}.apps\n"
            f"  4. makemigrations / migrate\n"
        ))

    def _templates(self, slug: str, prefix: str, class_name: str) -> dict[str, str]:
        app = f"apps/products/{slug}"
        return {
            f"{app}/__init__.py": "",
            f"{app}/apps.py": f'''from django.apps import AppConfig


class {class_name}Config(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.products.{slug}"
    label = "{slug}"

    def ready(self):
        from apps.registry.product import ProductConfig, ProductRegistry
        from .resource_registration import register_{slug}_resources

        ProductRegistry.register(
            ProductConfig(
                slug="{slug}",
                label="{class_name}",
                url_prefix="/api/{prefix}/",
                roles=["operator", "staff"],
                demo_tenant_slug="{slug}-demo",
                seed_command="seed_{slug}",
            )
        )
        register_{slug}_resources()
''',
            f"{app}/models.py": f'''from django.db import models

from apps.registry.models import TenantDomainModel


class {class_name}Item(TenantDomainModel):
    name = models.CharField(max_length=200)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name
''',
            f"{app}/serializers.py": f'''from rest_framework import serializers

from .models import {class_name}Item


class {class_name}ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = {class_name}Item
        fields = ["id", "name", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
''',
            f"{app}/views.py": f'''from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.products.{slug}.permissions import {class_name}OperatorPermission


class {class_name}DashboardView(APIView):
    permission_classes = [IsAuthenticated, {class_name}OperatorPermission]

    def get(self, request):
        return Response({{"product": "{slug}", "status": "ok"}})
''',
            f"{app}/permissions.py": f'''from rest_framework.permissions import BasePermission

from apps.registry.permissions import get_membership, get_tenant_role


class {class_name}OperatorPermission(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return (
            get_membership(request) is not None
            and get_tenant_role(request) in ("owner", "staff")
        )
''',
            f"{app}/rbac.py": f'''"""Declarative RBAC for {slug} meta resources."""

RESOURCE_RULES: dict[str, dict[str, dict]] = {{
    "{prefix}-items": {{
        "owner": {{"create": True, "update": True, "delete": True, "actions": None}},
        "staff": {{"create": True, "update": True, "delete": False, "actions": None}},
    }},
}}


def rules_for_role(slug: str, role: str | None) -> dict | None:
    if not role:
        return None
    return RESOURCE_RULES.get(slug, {{}}).get(role)


def can_access_resource(request, slug: str) -> bool:
    from apps.registry.permissions import get_tenant_role

    role = get_tenant_role(request)
    return role in ("owner", "staff") and slug in RESOURCE_RULES
''',
            f"{app}/resource_registration.py": f'''from apps.registry.registry import register_resource

from .models import {class_name}Item
from .serializers import {class_name}ItemSerializer
from .views_meta import {class_name}ItemViewSet


def register_{slug}_resources():
    register_resource(
        "{prefix}-items",
        {class_name}ItemViewSet,
        title="{class_name} items",
    )
''',
            f"{app}/views_meta.py": f'''from apps.registry.base import KernelModelViewSet
from apps.registry.rbac import CapabilityResourcePermission

from .models import {class_name}Item
from .rbac import can_access_resource, rules_for_role
from .serializers import {class_name}ItemSerializer


class _{class_name}RolePermission(CapabilityResourcePermission):
    rules_for_role = staticmethod(rules_for_role)
    can_access_resource = staticmethod(can_access_resource)


class {class_name}ItemViewSet(KernelModelViewSet):
    queryset = {class_name}Item.objects.all()
    serializer_class = {class_name}ItemSerializer
    resource_slug = "{prefix}-items"
    permission_classes = [_{class_name}RolePermission]
''',
            f"{app}/urls.py": f'''from django.urls import path

from .views import {class_name}DashboardView

urlpatterns = [
    path("dashboard/", {class_name}DashboardView.as_view(), name="{slug}-dashboard"),
]
''',
            f"{app}/services.py": f'''"""Domain logic for {slug}."""
''',
            f"{app}/admin.py": f'''from django.contrib import admin

from .models import {class_name}Item

admin.site.register({class_name}Item)
''',
            f"{app}/migrations/__init__.py": "",
            f"{app}/management/__init__.py": "",
            f"{app}/management/commands/__init__.py": "",
            f"{app}/management/commands/seed_{slug}.py": f'''from apps.registry.management.commands.base_seeder import ProductSeeder

from apps.products.{slug}.models import {class_name}Item


class Command(ProductSeeder):
    help = "Seed {slug} demo tenant"
    product_slug = "{slug}"
    default_tenant_slug = "{slug}-demo"

    def seed_data(self, options):
        self.log_create("{class_name}Item", name="Sample item")
        if not self.dry_run:
            {class_name}Item.objects.get_or_create(
                tenant=self.tenant,
                name="Sample item",
            )
''',
        }

    def _frontend_config(self, slug: str, prefix: str) -> str:
        class_name = _slug_to_class(slug)
        return f'''import type {{ ProductConfig }} from "@/types/product";

export const {slug.replace("-", "_")}Config: ProductConfig = {{
  slug: "{slug}",
  label: "{class_name}",
  dashboardEndpoint: "/{prefix}/dashboard/",
  navSections: {{
    TODAY: [{{ label: "Dashboard", href: "/{prefix}/dashboard", icon: "home" }}],
    MANAGE: [{{ label: "Items", href: "/r/{prefix}-items", icon: "list" }}],
  }},
}};
'''
