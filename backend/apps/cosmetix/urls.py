from django.urls import path
from .views import BrandingResolveView, MenuResolveAPIView

urlpatterns = [
    path("branding/resolve/", BrandingResolveView.as_view(), name="branding-resolve"),
    path("menu/<slug:slug>/resolve/", MenuResolveAPIView.as_view(), name="menu-resolve"),
]
