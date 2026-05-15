from django.urls import path
from .views import BrandingResolveView, MenuResolveAPIView, NavBarItemListView

urlpatterns = [
    path("branding/resolve/", BrandingResolveView.as_view(), name="branding-resolve"),
    path("nav-items/", NavBarItemListView.as_view(), name="nav-items"),
    path("menu/<slug:slug>/resolve/", MenuResolveAPIView.as_view(), name="menu-resolve"),
]
