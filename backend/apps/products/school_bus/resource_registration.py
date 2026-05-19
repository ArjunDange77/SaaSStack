from apps.registry.registry import get_resource, register_resource

from .permissions import SBRolePermission
from .views import (
    BusViewSet,
    DriverViewSet,
    FeeRecordViewSet,
    IncidentViewSet,
    ParentViewSet,
    ReminderViewSet,
    RouteStopViewSet,
    RouteViewSet,
    StopViewSet,
    StudentViewSet,
    TripAttendanceViewSet,
    TripViewSet,
)


def register_school_bus_resources() -> None:
    entries = [
        ("sb-drivers", DriverViewSet, "Drivers", "Fleet drivers"),
        ("sb-buses", BusViewSet, "Buses", "Fleet vehicles"),
        ("sb-routes", RouteViewSet, "Routes", "Bus routes"),
        ("sb-stops", StopViewSet, "Stops", "Pickup/drop stops"),
        ("sb-route-stops", RouteStopViewSet, "Route stops", "Ordered stops on routes"),
        ("sb-parents", ParentViewSet, "Parents", "Parent/guardian contacts"),
        ("sb-students", StudentViewSet, "Students", "Enrolled students"),
        ("sb-trips", TripViewSet, "Trips", "Daily trip runs"),
        ("sb-trip-attendance", TripAttendanceViewSet, "Attendance", "Trip attendance records"),
        ("sb-fee-records", FeeRecordViewSet, "Fees", "Monthly fee records"),
        ("sb-incidents", IncidentViewSet, "Incidents", "Operational incidents"),
        ("sb-reminders", ReminderViewSet, "Reminders", "In-app reminders"),
    ]
    for slug, vs, title, desc in entries:
        if get_resource(slug) is None:
            register_resource(
                slug,
                vs,
                title=title,
                description=desc,
                permission_classes=(SBRolePermission,),
            )
