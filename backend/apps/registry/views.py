from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.registry.constants import REGISTRY_SCHEMA_VERSION
from apps.registry.metadata import build_resource_metadata
from apps.registry.registry import get_resource, iter_resources


class ResourceListMetaView(APIView):
    """GET /api/meta/resources/ — registered slugs for shell / router."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = [
            {
                "slug": e.slug,
                "title": e.resolved_title(),
                "description": e.description,
                "schema_version": REGISTRY_SCHEMA_VERSION,
            }
            for e in iter_resources()
        ]
        return Response(data)


class ResourceSchemaView(APIView):
    """GET /api/meta/schema/<slug>/ — schema authority for the React engine."""

    permission_classes = [IsAuthenticated]

    def get(self, request, slug):
        entry = get_resource(slug)
        if entry is None:
            return Response({"detail": "unknown_resource"}, status=404)
        payload = build_resource_metadata(
            entry.slug,
            entry.viewset_class,
            title=entry.resolved_title(),
            description=entry.description,
        )
        return Response(payload)
