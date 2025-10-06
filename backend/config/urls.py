from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.http import HttpResponse

def index(request):
    return HttpResponse("SaaSStack backend up")

urlpatterns = [
    path("", index),
    path("admin/", admin.site.urls),
    path("api/auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/accounts/", include("apps.accounts.urls")),
    path("api/tenancy/", include("apps.tenancy.urls")),
    path("api/cosmetix/", include("apps.cosmetix.urls")),
]
