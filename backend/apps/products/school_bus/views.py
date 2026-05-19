from decimal import Decimal

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.registry.base import KernelModelViewSet

from .models import (
    Bus,
    Driver,
    FeeRecord,
    Incident,
    Parent,
    Reminder,
    Route,
    RouteStop,
    Stop,
    Student,
    Trip,
    TripAttendance,
)
from .permissions import (
    SBDriverPermission,
    SBOperatorPermission,
    SBParentPermission,
    SBRolePermission,
    get_driver_for_user,
    get_parent_for_user,
)
from .rbac import build_capabilities
from .serializers import (
    BulkAttendanceSerializer,
    BusSerializer,
    DriverSerializer,
    FeePaymentCreateSerializer,
    FeeRecordSerializer,
    IncidentSerializer,
    ParentSerializer,
    ReminderBroadcastSerializer,
    ReminderSerializer,
    RouteSerializer,
    RouteStopSerializer,
    StopSerializer,
    StudentSerializer,
    TripAttendanceSerializer,
    TripSerializer,
)
from . import services

SB_PERMISSIONS = (SBRolePermission,)


class SBViewSet(KernelModelViewSet):
    auto_activity_log = False
    permission_classes = SB_PERMISSIONS

    @classmethod
    def get_metadata_capabilities(cls, request):
        return build_capabilities(request, cls)


class DriverViewSet(SBViewSet):
    resource_slug = "sb-drivers"
    queryset = Driver.objects.all()
    serializer_class = DriverSerializer


class BusViewSet(SBViewSet):
    resource_slug = "sb-buses"
    queryset = Bus.objects.all()
    serializer_class = BusSerializer


class RouteViewSet(SBViewSet):
    resource_slug = "sb-routes"
    queryset = Route.objects.all()
    serializer_class = RouteSerializer


class StopViewSet(SBViewSet):
    resource_slug = "sb-stops"
    queryset = Stop.objects.all()
    serializer_class = StopSerializer


class RouteStopViewSet(SBViewSet):
    resource_slug = "sb-route-stops"
    queryset = RouteStop.objects.all()
    serializer_class = RouteStopSerializer


class ParentViewSet(SBViewSet):
    resource_slug = "sb-parents"
    queryset = Parent.objects.all()
    serializer_class = ParentSerializer


class StudentViewSet(SBViewSet):
    resource_slug = "sb-students"
    queryset = Student.objects.all()
    serializer_class = StudentSerializer


class TripViewSet(SBViewSet):
    resource_slug = "sb-trips"
    queryset = Trip.objects.all()
    serializer_class = TripSerializer


class TripAttendanceViewSet(SBViewSet):
    resource_slug = "sb-trip-attendance"
    queryset = TripAttendance.objects.all()
    serializer_class = TripAttendanceSerializer


class FeeRecordViewSet(SBViewSet):
    resource_slug = "sb-fee-records"
    queryset = FeeRecord.objects.all()
    serializer_class = FeeRecordSerializer

    @action(detail=True, methods=["post"], url_path="mark-paid")
    def mark_paid(self, request, pk=None):
        fee_record = self.get_object()
        ser = FeePaymentCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        payment = services.record_fee_payment(
            fee_record,
            Decimal(str(ser.validated_data["amount"])),
            ser.validated_data.get("note", ""),
        )
        return Response(
            {
                "fee_record_id": fee_record.id,
                "status": fee_record.status,
                "payment_id": payment.id,
            }
        )


class IncidentViewSet(SBViewSet):
    resource_slug = "sb-incidents"
    queryset = Incident.objects.all()
    serializer_class = IncidentSerializer


class ReminderViewSet(SBViewSet):
    resource_slug = "sb-reminders"
    queryset = Reminder.objects.all()
    serializer_class = ReminderSerializer


class OperatorDashboardView(APIView):
    permission_classes = [IsAuthenticated, SBOperatorPermission]

    def get(self, request):
        tenant = request.tenant
        if tenant is None:
            return Response({"detail": "Tenant required"}, status=400)
        return Response(services.operator_dashboard_payload(tenant))


class DriverTodayView(APIView):
    permission_classes = [IsAuthenticated, SBDriverPermission]

    def get(self, request):
        tenant = request.tenant
        driver = get_driver_for_user(request)
        if tenant is None or driver is None:
            return Response({"detail": "Driver profile required"}, status=400)
        try:
            payload = services.driver_today_payload(tenant, driver)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(payload)


class DriverTripStartView(APIView):
    permission_classes = [IsAuthenticated, SBDriverPermission]

    def post(self, request, trip_id):
        tenant = request.tenant
        driver = get_driver_for_user(request)
        trip = Trip.objects.filter(tenant=tenant, id=trip_id, driver=driver).first()
        if trip is None:
            return Response({"detail": "Not found"}, status=404)
        try:
            services.start_trip(trip)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response({"trip_id": trip.id, "status": trip.status})


class DriverTripAttendanceView(APIView):
    permission_classes = [IsAuthenticated, SBDriverPermission]

    def post(self, request, trip_id):
        tenant = request.tenant
        driver = get_driver_for_user(request)
        trip = Trip.objects.filter(tenant=tenant, id=trip_id, driver=driver).first()
        if trip is None:
            return Response({"detail": "Not found"}, status=404)
        ser = BulkAttendanceSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            count = services.mark_attendance(trip, ser.validated_data["marks"], request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response({"updated": count, "status": trip.status})


class DriverTripCompleteView(APIView):
    permission_classes = [IsAuthenticated, SBDriverPermission]

    def post(self, request, trip_id):
        tenant = request.tenant
        driver = get_driver_for_user(request)
        trip = Trip.objects.filter(tenant=tenant, id=trip_id, driver=driver).first()
        if trip is None:
            return Response({"detail": "Not found"}, status=404)
        try:
            services.complete_trip(trip)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response({"trip_id": trip.id, "status": trip.status})


class DriverIncidentCreateView(APIView):
    permission_classes = [IsAuthenticated, SBDriverPermission]

    def post(self, request):
        tenant = request.tenant
        driver = get_driver_for_user(request)
        if tenant is None or driver is None:
            return Response({"detail": "Driver profile required"}, status=400)
        ser = IncidentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        incident = ser.save(tenant=tenant, reported_by=request.user)
        trip = incident.trip
        if trip and trip.status != Trip.STATUS_COMPLETED:
            trip.status = Trip.STATUS_INCIDENT_REPORTED
            trip.save(update_fields=["status", "updated_at"])
        return Response(IncidentSerializer(incident).data, status=status.HTTP_201_CREATED)


class ParentMeView(APIView):
    permission_classes = [IsAuthenticated, SBParentPermission]

    def get(self, request):
        tenant = request.tenant
        parent = get_parent_for_user(request)
        if tenant is None or parent is None:
            return Response({"detail": "Parent profile required"}, status=400)
        return Response(services.parent_me_payload(tenant, parent))


class ParentRemindersView(APIView):
    permission_classes = [IsAuthenticated, SBParentPermission]

    def get(self, request):
        tenant = request.tenant
        parent = get_parent_for_user(request)
        if tenant is None or parent is None:
            return Response({"detail": "Parent profile required"}, status=400)
        from django.db.models import Q

        qs = Reminder.objects.filter(tenant=tenant).filter(
            Q(parent=parent) | Q(audience=Reminder.AUDIENCE_ALL)
        )
        return Response(ReminderSerializer(qs, many=True).data)


class OperatorReminderBroadcastView(APIView):
    permission_classes = [IsAuthenticated, SBOperatorPermission]

    def post(self, request):
        tenant = request.tenant
        if tenant is None:
            return Response({"detail": "Tenant required"}, status=400)
        ser = ReminderBroadcastSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        parent = None
        parent_id = ser.validated_data.get("parent_id")
        if parent_id:
            parent = Parent.objects.filter(tenant=tenant, id=parent_id).first()
        created = services.broadcast_reminder(
            tenant,
            kind=ser.validated_data["kind"],
            title=ser.validated_data["title"],
            body=ser.validated_data.get("body", ""),
            parent=parent,
        )
        return Response({"created": len(created)}, status=status.HTTP_201_CREATED)


# Legacy stub — redirect consumers to operator dashboard
class SchoolBusDashboardView(OperatorDashboardView):
    pass
