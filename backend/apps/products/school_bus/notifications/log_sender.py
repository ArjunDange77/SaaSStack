from apps.products.school_bus.models import OutboundMessage

from .base import MessageSender


class LogSender(MessageSender):
    def send(self, message: OutboundMessage) -> OutboundMessage:
        message.status = OutboundMessage.STATUS_DEMO
        message.provider_ref = "log-only"
        message.save(update_fields=["status", "provider_ref", "updated_at"])
        return message
