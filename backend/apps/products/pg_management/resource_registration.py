from apps.registry.permissions import TenantMembershipPermission
from apps.registry.registry import get_resource, register_resource

from .views import (
    BedAssignmentViewSet,
    ComplaintViewSet,
    DocumentViewSet,
    RentRecordViewSet,
    ResidentViewSet,
    RoomViewSet,
)


def register_pg_resources() -> None:
    entries = [
        ("pg-residents", ResidentViewSet, "Residents", "PG residents"),
        ("pg-rooms", RoomViewSet, "Rooms", "Rooms and occupancy"),
        ("pg-bed-assignments", BedAssignmentViewSet, "Bed assignments", "Resident room assignments"),
        ("pg-documents", DocumentViewSet, "Documents", "Resident documents"),
        ("pg-rent-records", RentRecordViewSet, "Rent", "Rent tracking"),
        ("pg-complaints", ComplaintViewSet, "Complaints", "Issues and complaints"),
    ]
    for slug, vs, title, desc in entries:
        if get_resource(slug) is None:
            register_resource(
                slug,
                vs,
                title=title,
                description=desc,
                permission_classes=(TenantMembershipPermission,),
            )
