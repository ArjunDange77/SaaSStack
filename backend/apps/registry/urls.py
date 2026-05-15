from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.registry import views as meta_views
from apps.registry.registry import iter_resources


def build_resource_router() -> DefaultRouter:
    router = DefaultRouter()
    for entry in iter_resources():
        router.register(entry.slug, entry.viewset_class, basename=f"res_{entry.slug.replace('-', '_')}")
    return router


resource_router = build_resource_router()

urlpatterns = [
    path("catalog/", meta_views.ResourceListMetaView.as_view(), name="meta-resource-catalog"),
    path("schema/<slug>/", meta_views.ResourceSchemaView.as_view(), name="meta-schema"),
    path("resources/", include(resource_router.urls)),
]
