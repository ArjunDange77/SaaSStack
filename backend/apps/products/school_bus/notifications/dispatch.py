from __future__ import annotations

import os

from apps.products.school_bus.models import OutboundMessage, Student, TenantMessagingConfig, TripAttendance

from .meta_whatsapp import MetaWhatsAppSender
from .whatsapp_click import WhatsAppClickSender


def _get_sender(tenant):
    cfg = TenantMessagingConfig.objects.filter(tenant=tenant).first()
    if cfg and not cfg.demo_mode and cfg.whatsapp_access_token:
        return MetaWhatsAppSender()
    return WhatsAppClickSender()


def dispatch_outbound(message: OutboundMessage) -> OutboundMessage:
    if os.getenv("SB_NOTIFICATIONS_SYNC", "1") == "1":
        return _get_sender(message.tenant).send(message)
    from apps.products.school_bus.tasks import send_outbound_message_task

    send_outbound_message_task.delay(message.id)
    return message


def notify_attendance_marked(tenant, *, student: Student, pickup_status: str, stop_name: str = "") -> OutboundMessage | None:
    parent = student.parent
    if parent is None or not parent.phone:
        return None
    if pickup_status != TripAttendance.PRESENT:
        return None
    body = (
        f"Hi {parent.full_name.split()[0]}, {student.full_name} was picked up"
        f"{f' at {stop_name}' if stop_name else ''}. — Sai Baba School Bus"
    )
    message = OutboundMessage.objects.create(
        tenant=tenant,
        event_type="pickup_confirmed",
        to_phone=parent.phone,
        student=student,
        template_key="pickup_confirmed",
        body=body,
        channel="whatsapp",
    )
    return dispatch_outbound(message)


def notifications_log_payload(tenant, limit: int = 100) -> list[dict]:
    rows = []
    for msg in OutboundMessage.objects.filter(tenant=tenant).select_related("student")[:limit]:
        phone = msg.to_phone
        masked = f"{phone[:4]}***{phone[-2:]}" if len(phone) > 6 else "***"
        rows.append(
            {
                "id": msg.id,
                "created_at": msg.created_at.isoformat(),
                "event_type": msg.event_type,
                "student_name": msg.student.full_name if msg.student else "",
                "to_phone_masked": masked,
                "channel": msg.channel,
                "status": msg.status,
                "whatsapp_url": msg.provider_ref if msg.provider_ref.startswith("http") else "",
                "body_preview": (msg.body or "")[:80],
            }
        )
    return rows
