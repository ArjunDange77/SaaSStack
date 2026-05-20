from urllib.parse import quote

from apps.products.school_bus.models import OutboundMessage

from .base import MessageSender


class WhatsAppClickSender(MessageSender):
    """Phase 1: record wa.me deep link for operator to open manually."""

    def send(self, message: OutboundMessage) -> OutboundMessage:
        phone = message.to_phone.lstrip("+")
        text = quote(message.body or "")
        message.provider_ref = f"https://wa.me/{phone}?text={text}"
        message.status = OutboundMessage.STATUS_DEMO
        message.save(update_fields=["status", "provider_ref", "updated_at"])
        return message
