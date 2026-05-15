from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.registry.base import KernelModelViewSet
from apps.registry.permissions import TenantMembershipPermission

from .models import BedAssignment, Complaint, Document, RentRecord, Resident, Room
from .serializers import (
    BedAssignmentSerializer,
    ComplaintSerializer,
    DocumentSerializer,
    RentRecordSerializer,
    ResidentSerializer,
    RoomSerializer,
)
from .services import (
    dashboard_stats,
    recalculate_room_occupancy,
    sync_resident_on_assign,
    sync_resident_on_vacate,
    validate_assignment,
)

PG_PERMISSIONS = (TenantMembershipPermission,)

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
        active_status = self.request.query_params.get("active_status")
        if active_status:
            qs = qs.filter(active_status=active_status)
        return qs

    def perform_create(self, serializer):
        super().perform_create(serializer)
        obj = serializer.instance
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
        "room_status",
    )
    empty_state = "No rooms configured. Add rooms to track occupancy."
    list_filters = (
        {"param": "room_status", "label": "Occupied", "value": "occupied"},
        {"param": "room_status", "label": "Available", "value": "available"},
        {"param": "room_status", "label": "Maintenance", "value": "maintenance"},
    )
    field_ui_overrides = {"room_status": BADGE_STATUS}

    def get_queryset(self):
        qs = super().get_queryset()
        room_status = self.request.query_params.get("room_status")
        if room_status:
            qs = qs.filter(room_status=room_status)
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

    def perform_create(self, serializer):
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
        qs = super().get_queryset()
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
        qs = super().get_queryset()
        status = self.request.query_params.get("status")
        if status:
            qs = qs.filter(status=status)
        return qs

    def perform_create(self, serializer):
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


class PGDashboardView(APIView):
    permission_classes = [IsAuthenticated, TenantMembershipPermission]

    def get(self, request):
        tenant = getattr(request, "tenant", None)
        if tenant is None:
            return Response({"detail": "tenant_required"}, status=400)
        return Response(dashboard_stats(tenant))
