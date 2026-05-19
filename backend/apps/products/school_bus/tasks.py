from celery import shared_task

from apps.products.school_bus.models import OutboundMessage
from apps.products.school_bus.notifications.dispatch import _get_sender


@shared_task
def send_outbound_message_task(message_id: int) -> None:
    message = OutboundMessage.objects.filter(id=message_id).first()
    if message is None:
        return
    _get_sender(message.tenant).send(message)
