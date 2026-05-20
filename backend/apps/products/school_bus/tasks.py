from celery import shared_task

from apps.products.school_bus import services
from apps.products.school_bus.models import OutboundMessage
from apps.products.school_bus.notifications.dispatch import _get_sender


@shared_task
def generate_daily_trips_task() -> int:
    """05:30 IST via beat schedule (00:00 UTC)."""
    return services.generate_daily_trips()


@shared_task
def send_outbound_message_task(message_id: int) -> None:
    message = OutboundMessage.objects.filter(id=message_id).first()
    if message is None:
        return
    _get_sender(message.tenant).send(message)
