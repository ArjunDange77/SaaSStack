import pytest
from django.core.management.color import no_style
from django.core.management.base import OutputWrapper
from io import StringIO

from apps.registry.management.commands.base_seeder import ProductSeeder
from apps.tenancy.models import Tenant


class _DemoSeeder(ProductSeeder):
    product_slug = "demo"
    default_tenant_slug = "demo-seed-test"

    def seed_data(self, options):
        self.log_create("Item", name="x")


@pytest.mark.django_db
def test_dry_run_does_not_create_tenant():
    out = StringIO()
    cmd = _DemoSeeder(stdout=OutputWrapper(out), stderr=OutputWrapper(StringIO()))
    cmd.style = no_style()
    before = Tenant.objects.filter(slug="demo-seed-test").count()
    cmd.handle(dry_run=True, reset=False, tenant=None, months=1)
    after = Tenant.objects.filter(slug="demo-seed-test").count()
    assert before == after
    assert "[dry-run]" in out.getvalue()
