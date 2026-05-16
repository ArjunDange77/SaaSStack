import contextvars
import logging

_request_ctx: contextvars.ContextVar = contextvars.ContextVar("http_request", default=None)


def bind_request(request):
    _request_ctx.set(request)


def clear_request():
    _request_ctx.set(None)


class RequestContextFilter(logging.Filter):
    """Inject request_id, tenant_slug, and user_id into every log record."""

    def filter(self, record):
        record.request_id = "-"
        record.tenant_slug = "-"
        record.user_id = "-"
        request = _request_ctx.get()
        if request is None:
            return True
        record.request_id = getattr(request, "request_id", "-")
        tenant = getattr(request, "tenant", None)
        record.tenant_slug = getattr(tenant, "slug", "-") if tenant else "-"
        user = getattr(request, "user", None)
        if user is not None and getattr(user, "is_authenticated", False):
            record.user_id = str(user.pk)
        return True
