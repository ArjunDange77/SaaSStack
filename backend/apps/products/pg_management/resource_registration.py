from apps.registry.registry import get_resource, register_resource

from .permissions import PGRolePermission
from .rbac import CATALOG_OPERATOR, CATALOG_RESIDENT
from .views import (
    BedAssignmentViewSet,
    BookingRequestViewSet,
    ComplaintViewSet,
    DocumentViewSet,
    RentRecordViewSet,
    ResidentViewSet,
    RoomViewSet,
)


def register_pg_resources() -> None:
    entries = [
        ("pg-residents", ResidentViewSet, "Residents", "PG residents", CATALOG_OPERATOR),
        ("pg-rooms", RoomViewSet, "Rooms", "Rooms and occupancy", CATALOG_OPERATOR),
        ("pg-bed-assignments", BedAssignmentViewSet, "Bed assignments", "Resident room assignments", CATALOG_OPERATOR),
        ("pg-documents", DocumentViewSet, "Documents", "Resident documents", CATALOG_OPERATOR + CATALOG_RESIDENT),
        ("pg-rent-records", RentRecordViewSet, "Rent", "Rent tracking", CATALOG_OPERATOR + CATALOG_RESIDENT),
        ("pg-complaints", ComplaintViewSet, "Complaints", "Issues and complaints", CATALOG_OPERATOR + CATALOG_RESIDENT),
        (
            "pg-booking-requests",
            BookingRequestViewSet,
            "Booking requests",
            "Public booking submissions",
            CATALOG_OPERATOR,
        ),
    ]
    for slug, vs, title, desc, roles in entries:
        existing = get_resource(slug)
        if existing is None:
            register_resource(
                slug,
                vs,
                title=title,
                description=desc,
                permission_classes=(PGRolePermission,),
                catalog_roles=roles,
            )
        else:
            existing.viewset_class = vs
            existing.title = title
            existing.description = desc
            existing.permission_classes = (PGRolePermission,)
            existing.catalog_roles = roles
