import pytest

from apps.products.school_bus.tasks import generate_daily_trips_task, send_outbound_message_task


@pytest.mark.django_db
def test_generate_daily_trips_task(sb_tenant, sb_driver_setup):
    route = sb_driver_setup["route"]
    route.default_driver = sb_driver_setup["driver"]
    route.save(update_fields=["default_driver"])
    assert generate_daily_trips_task() >= 0


@pytest.mark.django_db
def test_send_outbound_message_task_missing():
    send_outbound_message_task(999_999)
