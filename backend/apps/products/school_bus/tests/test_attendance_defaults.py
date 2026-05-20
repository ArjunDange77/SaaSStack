import pytest

from apps.products.school_bus import services
from apps.products.school_bus.models import TripAttendance


@pytest.mark.django_db
def test_fresh_trip_checklist_not_marked(sb_driver_client, sb_tenant, sb_driver_setup):
    from apps.products.school_bus.models import Student

    driver = sb_driver_setup["driver"]
    Student.objects.create(
        tenant=sb_tenant,
        full_name="Checklist Kid",
        assigned_route=driver.assigned_route,
        assigned_bus=driver.assigned_bus,
    )
    trip = services.ensure_trip_for_driver(sb_tenant, driver)
    services.start_trip(trip)
    response = sb_driver_client.get("/api/sb/driver/today/")
    assert response.status_code == 200
    checklist = response.json().get("checklist") or []
    assert checklist
    assert all(row["pickup_status"] == TripAttendance.NOT_MARKED for row in checklist)


@pytest.mark.django_db
def test_complete_trip_with_all_not_marked(sb_tenant, sb_driver_setup):
    trip = services.ensure_trip_for_driver(sb_tenant, sb_driver_setup["driver"])
    services.start_trip(trip)
    services.complete_trip(trip)
    trip.refresh_from_db()
    assert trip.status == "completed"
    assert not TripAttendance.objects.filter(
        trip=trip, pickup_status=TripAttendance.NOT_MARKED
    ).exists()
