from datetime import date
from io import StringIO

import pytest
from django.core.management import call_command

from apps.products.school_bus.models import Trip


@pytest.mark.django_db
def test_generate_today_trips_command(sb_tenant, sb_driver_setup):
    route = sb_driver_setup["route"]
    route.default_driver = sb_driver_setup["driver"]
    route.save(update_fields=["default_driver"])

    out = StringIO()
    call_command("generate_today_trips", tenant=sb_tenant.slug, stdout=out)
    assert "Generated/verified" in out.getvalue()
    assert Trip.objects.filter(tenant=sb_tenant).exists()


@pytest.mark.django_db
def test_generate_today_trips_dry_run(sb_tenant):
    out = StringIO()
    call_command("generate_today_trips", dry_run=True, stdout=out)
    assert "Would run" in out.getvalue()


@pytest.mark.django_db
def test_generate_today_trips_unknown_tenant():
    err = StringIO()
    call_command("generate_today_trips", tenant="missing-tenant", stderr=err)
    assert "Unknown tenant" in err.getvalue()


@pytest.mark.django_db
def test_generate_daily_trips_skips_weekend(sb_tenant, sb_driver_setup):
    from apps.products.school_bus import services

    saturday = date(2026, 5, 16)
    assert saturday.weekday() == 5
    assert services.generate_daily_trips(tenant=sb_tenant, trip_date=saturday) == 0
