"""
Pluggable outbound notification adapters (kernel).

Products register an adapter class on ProductConfig; School Bus uses OutboundMessage ORM
and wraps these adapters in product notifications/dispatch.py.
"""

from __future__ import annotations

import urllib.parse
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class NotificationEvent(str, Enum):
    PICKUP_MARKED = "pickup_marked"
    DROP_MARKED = "drop_marked"
    ABSENT_AT_STOP = "absent_at_stop"
    TRIP_DELAYED = "trip_delayed"
    FEE_OVERDUE = "fee_overdue"
    FEE_LINK_SENT = "fee_link_sent"
    BOOKING_CONFIRMED = "booking_confirmed"
    RENT_DUE = "rent_due"


@dataclass
class OutboundMessagePayload:
    tenant_id: int
    event: NotificationEvent | str
    to_phone: str
    template_key: str
    payload: dict[str, Any] = field(default_factory=dict)
    idempotency_key: str = ""
    body: str = ""


@dataclass
class SendResult:
    status: str
    provider_ref: str = ""


class BaseNotificationAdapter(ABC):
    @abstractmethod
    def send(self, message: OutboundMessagePayload) -> SendResult:
        ...

    @abstractmethod
    def build_url(self, message: OutboundMessagePayload) -> str | None:
        ...


class LogAdapter(BaseNotificationAdapter):
    """Default dev/demo: wa.me deep link, no external API."""

    def build_url(self, message: OutboundMessagePayload) -> str | None:
        text = message.body or message.payload.get("body", "")
        phone = message.to_phone.lstrip("+")
        if not phone:
            return None
        return f"https://wa.me/{phone}?text={urllib.parse.quote(text)}"

    def send(self, message: OutboundMessagePayload) -> SendResult:
        url = self.build_url(message) or "log-only"
        return SendResult(status="demo", provider_ref=url)
