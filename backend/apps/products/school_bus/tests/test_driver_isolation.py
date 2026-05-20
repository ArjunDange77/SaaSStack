"""Compliance: drivers must not access operator or kernel surfaces."""

import pytest

from apps.products.school_bus import services
from apps.products.school_bus.models import Trip
from apps.tenancy.models import Tenant, TenantMembership


@pytest.mark.django_db
def test_driver_denied_trip_reset_for_demo(sb_driver_client, sb_tenant, sb_driver_setup):
    from apps.products.school_bus import services

    trip = services.ensure_trip_for_driver(sb_tenant, sb_driver_setup["driver"])
    response = sb_driver_client.post(f"/api/meta/resources/sb-trips/{trip.id}/reset-for-demo/")
    assert response.status_code == 403


OPERATOR_DENY_URLS = [
    "/api/sb/operator/notifications/",
    "/api/sb/operator/dashboard/",
    "/api/sb/operator/briefing/",
    "/api/sb/operator/trips/today/",
    "/api/sb/operator/live-fleet/",
    "/api/meta/resources/sb-trips/",
    "/api/meta/resources/sb-students/",
    "/api/meta/schema/sb-trips/",
]


@pytest.mark.django_db
@pytest.mark.parametrize("url", OPERATOR_DENY_URLS)
def test_driver_denied_operator_and_kernel_urls(sb_driver_client, url):
    response = sb_driver_client.get(url)
    assert response.status_code == 403


@pytest.mark.django_db
def test_driver_denied_other_driver_trip_summary(
    sb_driver_client, sb_tenant, sb_driver_setup, sb_second_driver_setup
):
    other = sb_second_driver_setup["driver"]
    trip = services.ensure_trip_for_driver(sb_tenant, other)
    response = sb_driver_client.get(f"/api/sb/operator/trips/{trip.id}/summary/")
    assert response.status_code in (403, 404)


@pytest.mark.django_db
def test_driver_denied_cross_driver_incident(
    sb_driver_client, sb_tenant, sb_driver_setup, sb_second_driver_setup
):
    other_trip = services.ensure_trip_for_driver(sb_tenant, sb_second_driver_setup["driver"])
    response = sb_driver_client.post(
        "/api/sb/driver/incidents/",
        {"trip": other_trip.id, "severity": "low", "category": "other", "description": "test"},
        format="json",
    )
    assert response.status_code in (400, 404)


@pytest.mark.django_db
def test_driver_denied_cross_driver_attendance_post(
    sb_driver_client, sb_tenant, sb_second_driver_setup
):
    other_trip = services.ensure_trip_for_driver(sb_tenant, sb_second_driver_setup["driver"])
    services.start_trip(other_trip)
    response = sb_driver_client.post(
        f"/api/sb/driver/trips/{other_trip.id}/attendance/",
        {"marks": [{"student_id": 1, "pickup_status": "absent"}]},
        format="json",
    )
    assert response.status_code == 404


@pytest.mark.django_db
def test_driver_invalid_tenant_header_denied(api_client, sb_driver_setup):
    other = Tenant.objects.create(name="Other", slug="other-tenant-iso", is_active=True)
    api_client.force_authenticate(user=sb_driver_setup["user"])
    api_client.credentials(HTTP_X_TENANT=other.slug)
    response = api_client.get("/api/sb/driver/today/")
    assert response.status_code == 403


@pytest.mark.django_db
def test_driver_nav_items_empty(sb_driver_client):
    response = sb_driver_client.get("/api/cosmetix/nav-items/")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.django_db
def test_owner_can_access_operator_notifications(sb_operator_client):
    response = sb_operator_client.get("/api/sb/operator/notifications/")
    assert response.status_code == 200


@pytest.mark.django_db
def test_driver_can_access_today(sb_driver_client, sb_tenant, sb_driver_setup):
    trip = services.ensure_trip_for_driver(sb_tenant, sb_driver_setup["driver"])
    response = sb_driver_client.get("/api/sb/driver/today/")
    assert response.status_code == 200
    assert response.json()["trip_id"] == trip.id


@pytest.mark.django_db
def test_driver_own_attendance_post(sb_driver_client, sb_tenant, sb_driver_setup):
    trip = services.ensure_trip_for_driver(sb_tenant, sb_driver_setup["driver"])
    services.start_trip(trip)
    student = trip.attendance_records.select_related("student").first()
    if student is None:
        pytest.skip("no attendance rows")
    response = sb_driver_client.post(
        f"/api/sb/driver/trips/{trip.id}/attendance/",
        {
            "marks": [
                {
                    "student_id": student.student_id,
                    "pickup_status": "absent",
                    "pickup_absent_reason": "sick",
                }
            ]
        },
        format="json",
    )
    assert response.status_code == 200


@pytest.mark.django_db
def test_driver_denied_kernel_trip_detail(sb_driver_client, sb_tenant, sb_driver_setup):
    trip = services.ensure_trip_for_driver(sb_tenant, sb_driver_setup["driver"])
    response = sb_driver_client.get(f"/api/meta/resources/sb-trips/{trip.id}/")
    assert response.status_code == 403
