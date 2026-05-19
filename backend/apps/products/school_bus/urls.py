from django.urls import path

from .views import (
    DriverIncidentCreateView,
    DriverTodayView,
    DriverTripAttendanceView,
    DriverTripCompleteView,
    DriverTripStartView,
    OperatorAttendanceHistoryView,
    OperatorDashboardView,
    OperatorReminderBroadcastView,
    ParentMeView,
    ParentRemindersView,
    SchoolBusDashboardView,
)

urlpatterns = [
    path("dashboard/", SchoolBusDashboardView.as_view(), name="school-bus-dashboard"),
    path("operator/dashboard/", OperatorDashboardView.as_view(), name="sb-operator-dashboard"),
    path(
        "operator/attendance-history/",
        OperatorAttendanceHistoryView.as_view(),
        name="sb-operator-attendance-history",
    ),
    path("operator/reminders/", OperatorReminderBroadcastView.as_view(), name="sb-operator-reminders"),
    path("driver/today/", DriverTodayView.as_view(), name="sb-driver-today"),
    path("driver/trips/<int:trip_id>/start/", DriverTripStartView.as_view(), name="sb-driver-trip-start"),
    path(
        "driver/trips/<int:trip_id>/attendance/",
        DriverTripAttendanceView.as_view(),
        name="sb-driver-trip-attendance",
    ),
    path(
        "driver/trips/<int:trip_id>/complete/",
        DriverTripCompleteView.as_view(),
        name="sb-driver-trip-complete",
    ),
    path("driver/incidents/", DriverIncidentCreateView.as_view(), name="sb-driver-incidents"),
    path("parent/me/", ParentMeView.as_view(), name="sb-parent-me"),
    path("parent/reminders/", ParentRemindersView.as_view(), name="sb-parent-reminders"),
]
