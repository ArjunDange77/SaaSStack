from django.urls import path

from .views import PGDashboardView

urlpatterns = [
    path("dashboard/", PGDashboardView.as_view(), name="pg-dashboard"),
]
