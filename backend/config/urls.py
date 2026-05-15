from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

def index(request):
    return HttpResponse("SaaSStack backend up")

urlpatterns = [
    path("", index),
    path("admin/", admin.site.urls),
    path("api/auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/accounts/", include("apps.accounts.urls")),
    path("api/tenancy/", include("apps.tenancy.urls")),
    path("api/meta/", include("apps.registry.urls")),
    path("api/cosmetix/", include("apps.cosmetix.urls")),
    path("api/pg/", include("apps.products.pg_management.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
