from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.registry.base import KernelModelViewSet
from apps.registry.permissions import get_resident_id_for_user, get_tenant_role

from .models import BedAssignment, BookingRequest, Complaint, Document, RentRecord, Resident, Room
from .permissions import PGOperatorPermission, PGRolePermission, PGResidentOnlyPermission
from .rbac import build_capabilities, is_operator, is_resident, resident_queryset_filter
from .serializers import (
    BedAssignmentSerializer,
    BookingRequestSerializer,
    ComplaintSerializer,
    DocumentSerializer,
    PublicBookingSerializer,
    PublicRoomSerializer,
    RentRecordSerializer,
    ResidentSerializer,
    RoomSerializer,
    StaffInviteSerializer,
)
from .services import (
    approve_booking,
    create_resident_account,
    dashboard_stats,
    recalculate_room_occupancy,
    resident_portal_bundle,
    sync_resident_on_assign,
    sync_resident_on_vacate,
    validate_assignment,
)
from .throttles import (
    PublicBookingBurstThrottle,
    PublicBookingSubmitThrottle,
    PublicRoomsThrottle,
)

PUBLIC_ROOMS_THROTTLES = [PublicBookingBurstThrottle, PublicRoomsThrottle]
PUBLIC_SUBMIT_THROTTLES = [PublicBookingBurstThrottle, PublicBookingSubmitThrottle]

User = get_user_model()
PG_PERMISSIONS = (PGRolePermission,)

BADGE_STATUS = {
    "variant": "badge",
    "badge_map": {
        "pending": "warning",
        "in_progress": "warning",
        "open": "warning",
        "unpaid": "warning",
        "partial": "warning",
        "completed": "success",
        "verified": "success",
        "paid": "success",
        "resolved": "success",
        "active": "success",
        "available": "success",
        "occupied": "neutral",
        "vacated": "neutral",
        "rejected": "danger",
        "approved": "success",
        "closed": "neutral",
        "inactive": "neutral",
        "maintenance": "warning",
        "high": "danger",
        "medium": "warning",
        "low": "neutral",
    },
}


class PGViewSet(KernelModelViewSet):
    auto_activity_log = False
    permission_classes = PG_PERMISSIONS

    @classmethod
    def get_metadata_capabilities(cls, request):
        return build_capabilities(request, cls)

    def _scope_resident(self, qs):
        if is_resident(self.request):
            return resident_queryset_filter(self.request, qs)
        return qs


class ResidentViewSet(PGViewSet):
    resource_slug = "pg-residents"
    queryset = Resident.objects.all()
    serializer_class = ResidentSerializer
    search_fields = ("full_name", "phone", "email")
    ordering_fields = ("full_name", "created_at")
    ordering = ("full_name",)
    filter_backends = (SearchFilter, OrderingFilter)
    resource_list_display = (
        "id",
        "full_name",
        "phone",
        "onboarding_status",
        "active_status",
    )
    empty_state = "No residents yet. Add your first resident to get started."
    list_filters = (
        {"param": "active_status", "label": "Active", "value": "active"},
        {"param": "active_status", "label": "Inactive", "value": "inactive"},
    )
    field_ui_overrides = {
        "onboarding_status": {
            **BADGE_STATUS,
            "help_text": "Pending = new; In progress = onboarding; Completed = ready.",
        },
        "active_status": {
            **BADGE_STATUS,
            "help_text": "Active = currently staying; Inactive = vacated or not assigned.",
        },
    }

    def get_queryset(self):
        qs = super().get_queryset()
        if not is_operator(self.request):
            return qs.none()
        active_status = self.request.query_params.get("active_status")
        if active_status:
            qs = qs.filter(active_status=active_status)
        return qs

    def perform_create(self, serializer):
        super().perform_create(serializer)
        obj = serializer.instance
        create_login = self.request.data.get("create_login") in (True, "true", "1")
        username = self.request.data.get("username", "")
        password = self.request.data.get("password", "")
        if create_login and username and password:
            create_resident_account(resident=obj, username=username, password=password)
        self._log("resident.created", f"Resident {obj.full_name} created", obj.pk)


class RoomViewSet(PGViewSet):
    resource_slug = "pg-rooms"
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    search_fields = ("room_number", "floor")
    ordering_fields = ("room_number", "floor")
    ordering = ("floor", "room_number")
    filter_backends = (SearchFilter, OrderingFilter)
    resource_list_display = (
        "id",
        "room_number",
        "floor",
        "occupancy_display",
        "sharing_label",
        "availability_label",
        "room_status",
    )
    empty_state = "No rooms configured. Add rooms to track occupancy."
    list_filters = (
        {"param": "room_status", "label": "Occupied", "value": "occupied"},
        {"param": "room_status", "label": "Available", "value": "available"},
        {"param": "room_status", "label": "Maintenance", "value": "maintenance"},
        {"param": "full", "label": "Full", "value": "1"},
    )
    field_ui_overrides = {
        "room_status": BADGE_STATUS,
        "availability_label": {
            "variant": "badge",
            "badge_map": {
                "Available": "success",
                "Full": "neutral",
                "Maintenance": "warning",
                "Occupied": "neutral",
            },
        },
    }

    def get_queryset(self):
        qs = super().get_queryset()
        if not is_operator(self.request):
            return qs.none()
        room_status = self.request.query_params.get("room_status")
        if room_status:
            qs = qs.filter(room_status=room_status)
        if self.request.query_params.get("full") == "1":
            qs = qs.filter(room_status="occupied").extra(
                where=["current_occupancy >= occupancy_limit"]
            )
        return qs


class BedAssignmentViewSet(PGViewSet):
    resource_slug = "pg-bed-assignments"
    queryset = BedAssignment.objects.select_related("resident", "room")
    serializer_class = BedAssignmentSerializer
    search_fields = ("resident__full_name", "room__room_number")
    ordering_fields = ("assigned_date",)
    ordering = ("-assigned_date",)
    filter_backends = (SearchFilter, OrderingFilter)
    resource_list_display = ("id", "resident", "room", "assigned_date", "status")
    relation_display_fields = {"resident": "full_name", "room": "room_number"}
    field_ui_overrides = {"status": BADGE_STATUS}
    action_labels = {"vacate": "Vacate room", "transfer": "Transfer room"}

    def get_queryset(self):
        qs = super().get_queryset()
        qs = self._scope_resident(qs)
        if is_resident(self.request):
            qs = qs.filter(status="active", vacated_date__isnull=True)
        return qs

    def perform_create(self, serializer):
        super().perform_create(serializer)
        obj = serializer.instance
        sync_resident_on_assign(obj.resident)
        recalculate_room_occupancy(obj.room)
        self._log(
            "assignment.created",
            f"{obj.resident} assigned to room {obj.room.room_number}",
            obj.pk,
            metadata={"resident_id": obj.resident_id, "room_id": obj.room_id},
        )

    def perform_update(self, serializer):
        super().perform_update(serializer)
        obj = serializer.instance
        recalculate_room_occupancy(obj.room)

    @action(detail=True, methods=["post"], url_path="vacate")
    def vacate(self, request, pk=None):
        obj = self.get_object()
        obj.status = "vacated"
        obj.vacated_date = timezone.now().date()
        obj.save(update_fields=["status", "vacated_date"])
        recalculate_room_occupancy(obj.room)
        sync_resident_on_vacate(obj.resident)
        self._log("assignment.vacated", f"Vacated room {obj.room.room_number}", obj.pk)
        return Response(BedAssignmentSerializer(obj).data)

    @action(detail=True, methods=["post"], url_path="transfer")
    def transfer(self, request, pk=None):
        obj = self.get_object()
        new_room_id = request.data.get("room")
        if not new_room_id:
            return Response({"detail": "room is required"}, status=status.HTTP_400_BAD_REQUEST)
        tenant = getattr(request, "tenant", None)
        new_room = Room.objects.filter(tenant=tenant, pk=new_room_id).first()
        if not new_room:
            return Response({"detail": "room not found"}, status=status.HTTP_404_NOT_FOUND)
        try:
            validate_assignment(
                tenant=tenant,
                resident=obj.resident,
                room=new_room,
                exclude_pk=obj.pk,
            )
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        old_room = obj.room
        obj.status = "vacated"
        obj.vacated_date = timezone.now().date()
        obj.save(update_fields=["status", "vacated_date"])
        recalculate_room_occupancy(old_room)
        new_assignment = BedAssignment.objects.create(
            tenant=tenant,
            resident=obj.resident,
            room=new_room,
            assigned_date=timezone.now().date(),
            status="active",
            created_by=request.user,
            updated_by=request.user,
        )
        sync_resident_on_assign(obj.resident)
        recalculate_room_occupancy(new_room)
        self._log(
            "assignment.transferred",
            f"Transferred {obj.resident} to room {new_room.room_number}",
            new_assignment.pk,
        )
        return Response(BedAssignmentSerializer(new_assignment).data, status=status.HTTP_201_CREATED)


class DocumentViewSet(PGViewSet):
    resource_slug = "pg-documents"
    queryset = Document.objects.select_related("resident")
    serializer_class = DocumentSerializer
    search_fields = ("resident__full_name", "document_type")
    ordering = ("-created_at",)
    filter_backends = (SearchFilter, OrderingFilter)
    resource_list_display = ("id", "resident", "document_type", "verification_status")
    relation_display_fields = {"resident": "full_name"}
    field_ui_overrides = {"verification_status": BADGE_STATUS}
    action_labels = {"verify": "Verify document", "reject": "Reject document"}

    def get_queryset(self):
        return self._scope_resident(super().get_queryset())

    def perform_create(self, serializer):
        if is_resident(self.request):
            tenant = getattr(self.request, "tenant", None)
            serializer.save(
                resident_id=get_resident_id_for_user(self.request),
                tenant=tenant,
                created_by=self.request.user,
                updated_by=self.request.user,
            )
        else:
            super().perform_create(serializer)
        obj = serializer.instance
        self._log("document.created", f"Document {obj.document_type} uploaded", obj.pk)

    @action(detail=True, methods=["post"], url_path="verify")
    def verify(self, request, pk=None):
        obj = self.get_object()
        obj.verification_status = "verified"
        obj.save(update_fields=["verification_status"])
        self._log("document.verified", f"Document verified for {obj.resident}", obj.pk)
        return Response(DocumentSerializer(obj).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        obj = self.get_object()
        obj.verification_status = "rejected"
        obj.remarks = request.data.get("remarks", obj.remarks)
        obj.save(update_fields=["verification_status", "remarks"])
        self._log("document.rejected", f"Document rejected for {obj.resident}", obj.pk)
        return Response(DocumentSerializer(obj).data)


class RentRecordViewSet(PGViewSet):
    resource_slug = "pg-rent-records"
    queryset = RentRecord.objects.select_related("resident")
    serializer_class = RentRecordSerializer
    search_fields = ("resident__full_name",)
    ordering_fields = ("due_date", "amount")
    ordering = ("-due_date",)
    filter_backends = (SearchFilter, OrderingFilter)
    resource_list_display = ("id", "resident", "amount", "due_date", "paid_status")
    relation_display_fields = {"resident": "full_name"}
    empty_state = "No rent records. Create rent entries to track payments."
    list_filters = (
        {"param": "paid_status", "label": "Unpaid", "value": "unpaid"},
        {"param": "overdue", "label": "Overdue", "value": "true"},
    )
    action_labels = {"mark_paid": "Mark paid"}
    field_ui_overrides = {
        "paid_status": BADGE_STATUS,
        "due_date": {"date_highlight": "past"},
    }

    def get_queryset(self):
        qs = self._scope_resident(super().get_queryset())
        if not is_operator(self.request):
            return qs
        paid_status = self.request.query_params.get("paid_status")
        if paid_status:
            qs = qs.filter(paid_status=paid_status)
        if self.request.query_params.get("overdue") == "true":
            qs = qs.filter(paid_status="unpaid", due_date__lt=timezone.now().date())
        return qs

    @action(detail=True, methods=["post"], url_path="mark-paid")
    def mark_paid(self, request, pk=None):
        obj = self.get_object()
        mode = request.data.get("paid_status", "paid")
        if mode == "partial":
            obj.paid_status = "partial"
        else:
            obj.paid_status = "paid"
            obj.paid_date = timezone.now().date()
        obj.payment_method = request.data.get("payment_method", obj.payment_method or "cash")
        obj.save(update_fields=["paid_status", "paid_date", "payment_method"])
        self._log("rent.paid", f"Rent {obj.paid_status} for {obj.resident}", obj.pk)
        return Response(RentRecordSerializer(obj).data)


class ComplaintViewSet(PGViewSet):
    resource_slug = "pg-complaints"
    queryset = Complaint.objects.select_related("resident")
    serializer_class = ComplaintSerializer
    search_fields = ("title", "resident__full_name", "description")
    ordering_fields = ("created_at", "priority")
    ordering = ("-created_at",)
    filter_backends = (SearchFilter, OrderingFilter)
    resource_list_display = ("id", "title", "resident", "status", "priority")
    relation_display_fields = {"resident": "full_name", "resolved_by": "username"}
    empty_state = "No complaints. Residents can raise issues here when needed."
    list_filters = (
        {"param": "status", "label": "Open", "value": "open"},
        {"param": "status", "label": "In progress", "value": "in_progress"},
    )
    action_labels = {
        "in_progress": "Mark in progress",
        "resolve": "Resolve",
    }
    field_ui_overrides = {"status": BADGE_STATUS, "priority": BADGE_STATUS}

    def get_queryset(self):
        qs = self._scope_resident(super().get_queryset())
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    def perform_create(self, serializer):
        if is_resident(self.request):
            tenant = getattr(self.request, "tenant", None)
            serializer.save(
                resident_id=get_resident_id_for_user(self.request),
                tenant=tenant,
                created_by=self.request.user,
                updated_by=self.request.user,
            )
        else:
            super().perform_create(serializer)
        obj = serializer.instance
        self._log("complaint.created", f"Complaint opened: {obj.title}", obj.pk)

    @action(detail=True, methods=["post"], url_path="in-progress")
    def in_progress(self, request, pk=None):
        obj = self.get_object()
        obj.status = "in_progress"
        obj.save(update_fields=["status"])
        self._log("complaint.in_progress", f"Complaint in progress: {obj.title}", obj.pk)
        return Response(ComplaintSerializer(obj).data)

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        obj = self.get_object()
        obj.status = "resolved"
        obj.resolved_at = timezone.now()
        obj.resolved_by = request.user
        obj.save(update_fields=["status", "resolved_at", "resolved_by"])
        self._log("complaint.resolved", f"Complaint resolved: {obj.title}", obj.pk)
        return Response(ComplaintSerializer(obj).data)


class BookingRequestViewSet(PGViewSet):
    resource_slug = "pg-booking-requests"
    queryset = BookingRequest.objects.select_related("preferred_room")
    serializer_class = BookingRequestSerializer
    search_fields = ("full_name", "phone")
    ordering = ("-created_at",)
    filter_backends = (SearchFilter, OrderingFilter)
    resource_list_display = ("id", "full_name", "phone", "status", "preferred_room")
    relation_display_fields = {"preferred_room": "room_number"}
    field_ui_overrides = {"status": BADGE_STATUS}
    action_labels = {"approve": "Approve", "reject": "Reject"}
    list_filters = ({"param": "status", "label": "Pending", "value": "pending"},)

    def get_queryset(self):
        qs = super().get_queryset()
        if not is_operator(self.request):
            return qs.none()
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        booking = self.get_object()
        create_login = request.data.get("create_login") in (True, "true", "1")
        username = request.data.get("username", "")
        password = request.data.get("password", "")
        try:
            resident = approve_booking(
                booking,
                actor=request.user,
                create_login=create_login,
                username=username,
                password=password,
            )
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        self._log("booking.approved", f"Booking approved for {booking.full_name}", booking.pk)
        return Response(
            {
                "booking": BookingRequestSerializer(booking).data,
                "resident_id": resident.id,
            }
        )

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        booking = self.get_object()
        if booking.status != "pending":
            return Response({"detail": "Only pending bookings can be rejected."}, status=400)
        booking.status = "rejected"
        booking.remarks = request.data.get("remarks", booking.remarks)
        booking.save(update_fields=["status", "remarks"])
        self._log("booking.rejected", f"Booking rejected for {booking.full_name}", booking.pk)
        return Response(BookingRequestSerializer(booking).data)


class PGDashboardView(APIView):
    permission_classes = [IsAuthenticated, PGOperatorPermission]

    def get(self, request):
        tenant = getattr(request, "tenant", None)
        if tenant is None:
            return Response({"detail": "tenant_required"}, status=400)
        return Response(dashboard_stats(tenant))


class ResidentMeView(APIView):
    permission_classes = [IsAuthenticated, PGResidentOnlyPermission]

    def get(self, request):
        tenant = getattr(request, "tenant", None)
        resident_id = get_resident_id_for_user(request)
        if tenant is None or resident_id is None:
            return Response({"detail": "resident_profile_not_found"}, status=404)
        resident = Resident.objects.filter(
            tenant=tenant, pk=resident_id, deleted_at__isnull=True
        ).first()
        if not resident:
            return Response({"detail": "resident_profile_not_found"}, status=404)
        return Response(resident_portal_bundle(tenant=tenant, resident=resident))


class StaffInviteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if get_tenant_role(request) != "owner":
            return Response({"detail": "Only owners can invite staff."}, status=403)
        tenant = getattr(request, "tenant", None)
        if tenant is None:
            return Response({"detail": "tenant_required"}, status=400)
        ser = StaffInviteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        if User.objects.filter(username=data["username"]).exists():
            return Response({"detail": "Username already taken."}, status=400)
        user = User.objects.create_user(
            username=data["username"],
            email=data.get("email", ""),
            password=data["password"],
        )
        from apps.tenancy.models import TenantMembership

        TenantMembership.objects.create(
            user=user,
            tenant=tenant,
            role=TenantMembership.ROLE_STAFF,
            is_active=True,
        )
        return Response({"id": user.id, "username": user.username}, status=status.HTTP_201_CREATED)


@method_decorator(never_cache, name="dispatch")
class PublicAvailableRoomsView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = PUBLIC_ROOMS_THROTTLES

    def get(self, request, tenant_slug):
        from apps.tenancy.models import Tenant

        tenant = Tenant.objects.filter(slug=tenant_slug, is_active=True).first()
        if not tenant:
            return Response({"detail": "tenant_not_found"}, status=404)
        rooms = Room.objects.filter(
            tenant=tenant,
            room_status="available",
        ).extra(where=["current_occupancy < occupancy_limit"])
        return Response(PublicRoomSerializer(rooms, many=True).data)


@method_decorator(never_cache, name="dispatch")
class PublicBookingCreateView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = PUBLIC_SUBMIT_THROTTLES

    def post(self, request, tenant_slug):
        from apps.tenancy.models import Tenant

        tenant = Tenant.objects.filter(slug=tenant_slug, is_active=True).first()
        if not tenant:
            return Response({"detail": "tenant_not_found"}, status=404)
        ser = PublicBookingSerializer(data=request.data, context={"tenant": tenant})
        ser.is_valid(raise_exception=True)
        booking = BookingRequest.objects.create(
            tenant=tenant,
            full_name=ser.validated_data["full_name"],
            phone=ser.validated_data["phone"],
            preferred_room=ser.validated_data.get("preferred_room"),
            duration=ser.validated_data.get("duration", ""),
            remarks=ser.validated_data.get("remarks", ""),
            status="pending",
            is_active=True,
        )
        return Response(
            {"id": booking.id, "status": booking.status, "message": "Booking request submitted."},
            status=status.HTTP_201_CREATED,
        )
