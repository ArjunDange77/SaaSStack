import uuid

from django.utils.deprecation import MiddlewareMixin

from apps.registry.logging_filters import bind_request, clear_request


class RequestContextMiddleware(MiddlewareMixin):
    """
    Attach request_id for log correlation; honor inbound X-Request-ID when present.
    """

    def process_request(self, request):
        incoming = request.headers.get("X-Request-ID") or request.META.get("HTTP_X_REQUEST_ID")
        request.request_id = incoming.strip() if incoming else str(uuid.uuid4())
        bind_request(request)

    def process_response(self, request, response):
        request_id = getattr(request, "request_id", None)
        if request_id:
            response["X-Request-ID"] = request_id
        clear_request()
        return response

    def process_exception(self, request, exception):
        clear_request()
        return None
