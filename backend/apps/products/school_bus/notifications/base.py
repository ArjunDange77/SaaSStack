from __future__ import annotations

from abc import ABC, abstractmethod

from apps.products.school_bus.models import OutboundMessage


class MessageSender(ABC):
    @abstractmethod
    def send(self, message: OutboundMessage) -> OutboundMessage:
        pass
