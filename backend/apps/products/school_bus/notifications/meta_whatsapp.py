"""Phase 2 stub — wire Meta Cloud API when Business account is approved."""

from apps.products.school_bus.models import OutboundMessage

from .base import MessageSender


class MetaWhatsAppSender(MessageSender):
    def send(self, message: OutboundMessage) -> OutboundMessage:
        message.status = OutboundMessage.STATUS_FAILED
        message.error = "Meta WhatsApp API not configured"
        message.save(update_fields=["status", "error", "updated_at"])
        return message
