from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import MyTenantsView, TenantViewSet

router = DefaultRouter()
router.register(r"tenants", TenantViewSet, basename="tenant")

urlpatterns = [
    path("my-tenants/", MyTenantsView.as_view(), name="my-tenants"),
    path("v1/", include(router.urls)),
]
