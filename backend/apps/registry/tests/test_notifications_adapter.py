from apps.registry.notifications.adapter import (
    LogAdapter,
    NotificationEvent,
    OutboundMessagePayload,
)


def test_log_adapter_build_url():
    msg = OutboundMessagePayload(
        tenant_id=1,
        event=NotificationEvent.PICKUP_MARKED,
        to_phone="+919876543210",
        template_key="pickup",
        body="Hello parent",
    )
    adapter = LogAdapter()
    url = adapter.build_url(msg)
    assert url is not None
    assert "wa.me/919876543210" in url
    assert "Hello" in url


def test_log_adapter_send_returns_demo():
    msg = OutboundMessagePayload(
        tenant_id=1,
        event=NotificationEvent.FEE_OVERDUE,
        to_phone="+911234567890",
        template_key="fee",
        body="Fee due",
        idempotency_key="t1-fee-1",
    )
    result = LogAdapter().send(msg)
    assert result.status == "demo"
    assert result.provider_ref.startswith("https://wa.me/")
