import pytest

from apps.products.school_bus import services
from apps.products.school_bus.models import Student, Trip


@pytest.mark.django_db
def test_operator_dashboard_api(sb_operator_client, sb_tenant, sb_driver_setup):
    response = sb_operator_client.get("/api/sb/operator/dashboard/")
    assert response.status_code == 200
    assert "active_buses" in response.json()


@pytest.mark.django_db
def test_driver_today_api(sb_driver_client, sb_tenant, sb_driver_setup):
    services.ensure_trip_for_driver(sb_tenant, sb_driver_setup["driver"])
    response = sb_driver_client.get("/api/sb/driver/today/")
    assert response.status_code == 200
    data = response.json()
    assert data["trip_id"] is not None
    assert data["trip_status"] == Trip.STATUS_SCHEDULED
    assert data["can_open_checklist"] is False
    assert data["checklist"] == []


@pytest.mark.django_db
def test_driver_today_hides_completed_trip(sb_driver_client, sb_tenant, sb_driver_setup):
    trip = services.ensure_trip_for_driver(sb_tenant, sb_driver_setup["driver"])
    trip.status = Trip.STATUS_COMPLETED
    trip.save(update_fields=["status"])
    response = sb_driver_client.get("/api/sb/driver/today/")
    assert response.status_code == 200
    data = response.json()
    assert data["trip_id"] is None
    assert data["checklist"] == []


@pytest.mark.django_db
def test_driver_trip_flow(sb_driver_client, sb_tenant, sb_driver_setup):
    trip = services.ensure_trip_for_driver(sb_tenant, sb_driver_setup["driver"])
    today = sb_driver_client.get("/api/sb/driver/today/").json()
    trip_id = today["trip_id"] or trip.id
    assert sb_driver_client.post(f"/api/sb/driver/trips/{trip_id}/start/").status_code == 200
    assert (
        sb_driver_client.post(
            f"/api/sb/driver/trips/{trip_id}/attendance/",
            {"marks": []},
            format="json",
        ).status_code
        == 200
    )
    assert sb_driver_client.post(f"/api/sb/driver/trips/{trip_id}/complete/").status_code == 200


@pytest.mark.django_db
def test_parent_me_api(sb_parent_client, sb_tenant, sb_parent_setup):
    parent = sb_parent_setup["parent"]
    Student.objects.create(
        tenant=sb_tenant,
        full_name="Child",
        parent=parent,
    )
    response = sb_parent_client.get("/api/sb/parent/me/")
    assert response.status_code == 200
    data = response.json()
    assert len(data["children"]) == 1


@pytest.mark.django_db
def test_parent_me_requires_parent_role(sb_operator_client):
    assert sb_operator_client.get("/api/sb/parent/me/").status_code == 403
