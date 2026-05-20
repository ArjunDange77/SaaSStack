from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.registry.constants import REGISTRY_SCHEMA_VERSION
from apps.registry.metadata import build_resource_metadata
from apps.registry.models import ActivityLog
from apps.registry.permissions import get_tenant_role
from apps.registry.registry import get_resource, iter_resources
from apps.registry.serializers import ActivityLogSerializer


class ResourceListMetaView(APIView):
    """GET /api/meta/resources/ — registered slugs for shell / router."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = get_tenant_role(request)
        data = []
        for e in iter_resources():
            if e.catalog_hidden:
                continue
            if e.catalog_roles and (not role or role not in e.catalog_roles):
                continue
            data.append(
                {
                    "slug": e.slug,
                    "title": e.resolved_title(),
                    "description": e.description,
                    "schema_version": REGISTRY_SCHEMA_VERSION,
                }
            )
        return Response(data)


def _deny_product_resource_access(request, slug: str) -> Response | None:
    if slug.startswith("sb-"):
        from apps.products.school_bus.rbac import can_access_resource

        if not can_access_resource(request, slug):
            return Response({"detail": "You do not have permission to perform this action."}, status=403)
    if slug.startswith("pg-"):
        from apps.products.pg_management.rbac import can_access_resource

        if not can_access_resource(request, slug):
            return Response({"detail": "You do not have permission to perform this action."}, status=403)
    return None


class ResourceSchemaView(APIView):
    """GET /api/meta/schema/<slug>/ — schema authority for the React engine."""

    permission_classes = [IsAuthenticated]

    def get(self, request, slug):
        denied = _deny_product_resource_access(request, slug)
        if denied is not None:
            return denied
        entry = get_resource(slug)
        if entry is None:
            return Response({"detail": "unknown_resource"}, status=404)
        payload = build_resource_metadata(
            entry.slug,
            entry.viewset_class,
            title=entry.resolved_title(),
            description=entry.description,
            request=request,
        )
        return Response(payload)


class ActivityListView(APIView):
    """GET /api/meta/activity/?resource_slug=&object_id="""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = getattr(request, "tenant", None)
        if tenant is None:
            return Response([])
        qs = ActivityLog.objects.filter(tenant=tenant)
        resource_slug = request.query_params.get("resource_slug")
        object_id = request.query_params.get("object_id")
        if resource_slug:
            qs = qs.filter(resource_slug=resource_slug)
        if object_id:
            qs = qs.filter(object_id=str(object_id))
        qs = qs[:100]
        return Response(ActivityLogSerializer(qs, many=True).data)
