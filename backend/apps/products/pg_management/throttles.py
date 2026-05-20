"""Rate limits for anonymous public booking endpoints."""

import logging

from rest_framework.throttling import AnonRateThrottle

logger = logging.getLogger(__name__)


class ClientIpAnonRateThrottle(AnonRateThrottle):
    """Use first X-Forwarded-For hop when behind Azure App Service."""

    def get_ident(self, request):
        xff = request.META.get("HTTP_X_FORWARDED_FOR")
        if xff:
            return xff.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "")

    def allow_request(self, request, view):
        try:
            allowed = super().allow_request(request, view)
        except Exception:
            # Cache/DB outage must not take down public booking (rate limits skipped).
            logger.warning(
                "public_booking_throttle_cache_unavailable scope=%s path=%s ip=%s",
                getattr(self, "scope", "anon"),
                request.path,
                self.get_ident(request),
                exc_info=True,
            )
            return True
        if not allowed:
            logger.warning(
                "public_booking_rate_limited scope=%s path=%s ip=%s",
                getattr(self, "scope", "anon"),
                request.path,
                self.get_ident(request),
            )
        return allowed


class PublicBookingBurstThrottle(ClientIpAnonRateThrottle):
    scope = "public_booking_burst"

    def get_rate(self):
        from django.conf import settings

        return getattr(settings, "PUBLIC_BOOKING_BURST_RATE", "5/minute")


class PublicRoomsThrottle(ClientIpAnonRateThrottle):
    scope = "public_booking_rooms"

    def get_rate(self):
        from django.conf import settings

        return getattr(settings, "PUBLIC_BOOKING_ROOMS_RATE", "60/hour")


class PublicBookingSubmitThrottle(ClientIpAnonRateThrottle):
    scope = "public_booking_submit"

    def get_rate(self):
        from django.conf import settings

        return getattr(settings, "PUBLIC_BOOKING_SUBMIT_RATE", "10/hour")
