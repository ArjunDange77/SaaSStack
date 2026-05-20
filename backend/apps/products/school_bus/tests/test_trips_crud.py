from datetime import date

import pytest

from apps.products.school_bus import services
from apps.products.school_bus.models import Trip


@pytest.mark.django_db
def test_create_trip_duplicate_returns_400(sb_operator_client, sb_tenant, sb_driver_setup):
    driver = sb_driver_setup["driver"]
    trip_date = date(2026, 5, 20)
    services.ensure_trip_for_driver(sb_tenant, driver, trip_date=trip_date)

    response = sb_operator_client.post(
        "/api/meta/resources/sb-trips/",
        {
            "route": driver.assigned_route_id,
            "bus": driver.assigned_bus_id,
            "driver": driver.id,
            "trip_date": trip_date.isoformat(),
            "status": Trip.STATUS_SCHEDULED,
        },
        format="json",
    )
    assert response.status_code == 400
    body = response.json()
    assert "already exists" in str(body.get("non_field_errors", body)).lower()


@pytest.mark.django_db
def test_create_trip_success(sb_operator_client, sb_tenant, sb_driver_setup):
    driver = sb_driver_setup["driver"]
    trip_date = date(2026, 6, 1)

    response = sb_operator_client.post(
        "/api/meta/resources/sb-trips/",
        {
            "route": driver.assigned_route_id,
            "bus": driver.assigned_bus_id,
            "driver": driver.id,
            "trip_date": trip_date.isoformat(),
            "status": Trip.STATUS_SCHEDULED,
        },
        format="json",
    )
    assert response.status_code == 201
    assert Trip.objects.filter(tenant=sb_tenant, trip_date=trip_date, driver=driver).count() == 1
