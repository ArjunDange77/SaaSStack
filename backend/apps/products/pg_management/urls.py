from django.urls import path

from .views import (
    PGDashboardView,
    PublicAvailableRoomsView,
    PublicBookingCreateView,
    ResidentMeView,
    StaffInviteView,
)

urlpatterns = [
    path("dashboard/", PGDashboardView.as_view(), name="pg-dashboard"),
    path("resident/me/", ResidentMeView.as_view(), name="pg-resident-me"),
    path("staff/invite/", StaffInviteView.as_view(), name="pg-staff-invite"),
    path(
        "public/<slug:tenant_slug>/rooms/available/",
        PublicAvailableRoomsView.as_view(),
        name="pg-public-rooms",
    ),
    path(
        "public/<slug:tenant_slug>/booking-requests/",
        PublicBookingCreateView.as_view(),
        name="pg-public-booking",
    ),
]
