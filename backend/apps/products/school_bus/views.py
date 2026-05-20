from datetime import timedelta
from decimal import Decimal

from django.db import IntegrityError
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
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
    is_operator,
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
    resource_list_display = (
        "id",
        "full_name",
        "school_name",
        "class_grade",
        "assigned_route",
        "assigned_bus",
        "current_fee_status",
    )
    search_fields = ("full_name", "school_name", "class_grade")

    def get_queryset(self):
        return services.annotate_student_fee_status(super().get_queryset())


class TripViewSet(SBViewSet):
    resource_slug = "sb-trips"
    queryset = Trip.objects.select_related("route", "bus", "driver")
    serializer_class = TripSerializer
    action_labels = {"reset_for_demo": "Reset"}
    search_fields = ("route__name", "bus__fleet_number", "driver__full_name")
    ordering_fields = ("trip_date", "id", "status", "started_at", "completed_at")
    ordering = ("-trip_date", "-id")
    filter_backends = (SearchFilter, OrderingFilter)
    relation_display_fields = {
        "route": "name",
        "bus": "fleet_number",
        "driver": "full_name",
    }
    resource_list_display = (
        "id",
        "trip_date",
        "route",
        "bus",
        "driver",
        "status",
        "started_at",
        "completed_at",
    )
    list_filters = (
        {"param": "status", "label": "Scheduled", "value": Trip.STATUS_SCHEDULED},
        {"param": "status", "label": "In progress", "value": Trip.STATUS_PICKUP_IN_PROGRESS},
        {"param": "status", "label": "Completed", "value": Trip.STATUS_COMPLETED},
        {"param": "status", "label": "Delayed", "value": Trip.STATUS_DELAYED},
    )

    _DUPLICATE_TRIP_MSG = (
        "A trip already exists for this route, bus, driver, and date. "
        "Open the existing trip or change route, bus, driver, or date."
    )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
        except IntegrityError:
            raise ValidationError(self._DUPLICATE_TRIP_MSG) from None
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        trip_date = self.request.query_params.get("trip_date")
        if trip_date:
            qs = qs.filter(trip_date=trip_date)
        return qs

    @action(detail=True, methods=["post"], url_path="reset-for-demo")
    def reset_for_demo(self, request, pk=None):
        if not is_operator(request):
            return Response({"detail": "Operator access required."}, status=403)
        trip = self.get_object()
        try:
            services.reset_trip_for_demo(trip)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        trip.refresh_from_db()
        return Response(TripSerializer(trip).data)


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


class OperatorBriefingView(APIView):
    permission_classes = [IsAuthenticated, SBOperatorPermission]

    def get(self, request):
        tenant = request.tenant
        if tenant is None:
            return Response({"detail": "Tenant required"}, status=400)
        return Response(services.operator_briefing_payload(tenant, request.user))


class OperatorLiveFleetView(APIView):
    permission_classes = [IsAuthenticated, SBOperatorPermission]

    def get(self, request):
        tenant = request.tenant
        if tenant is None:
            return Response({"detail": "Tenant required"}, status=400)
        return Response(services.operator_live_fleet_payload(tenant))


class OperatorTripsGenerateView(APIView):
    permission_classes = [IsAuthenticated, SBOperatorPermission]

    def post(self, request):
        from datetime import date as date_cls

        tenant = request.tenant
        if tenant is None:
            return Response({"detail": "Tenant required"}, status=400)
        days = request.data.get("days")
        if days is not None:
            try:
                days = int(days)
            except (TypeError, ValueError):
                return Response({"detail": "days must be an integer"}, status=400)
            start = services._today()
            end = start + timedelta(days=max(0, days - 1))
        else:
            raw_start = request.data.get("start_date") or str(services._today())
            raw_end = request.data.get("end_date") or raw_start
            try:
                start = date_cls.fromisoformat(str(raw_start))
                end = date_cls.fromisoformat(str(raw_end))
            except ValueError:
                return Response({"detail": "Invalid date"}, status=400)
        try:
            payload = services.generate_trips_for_range(tenant, start, end)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(payload)


class OperatorTripSummaryView(APIView):
    permission_classes = [IsAuthenticated, SBOperatorPermission]

    def get(self, request, trip_id: int):
        tenant = request.tenant
        if tenant is None:
            return Response({"detail": "Tenant required"}, status=400)
        try:
            payload = services.operator_trip_summary_payload(tenant, trip_id)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(payload)


class OperatorFeesGroupedView(APIView):
    permission_classes = [IsAuthenticated, SBOperatorPermission]

    def get(self, request):
        tenant = request.tenant
        if tenant is None:
            return Response({"detail": "Tenant required"}, status=400)
        month = request.query_params.get("month")
        return Response(services.operator_fees_grouped_payload(tenant, month=month))


class OperatorNotificationsLogView(APIView):
    permission_classes = [IsAuthenticated, SBOperatorPermission]

    def get(self, request):
        tenant = request.tenant
        if tenant is None:
            return Response({"detail": "Tenant required"}, status=400)
        if request.query_params.get("count") == "1":
            return Response({"unread_count": services.operator_notifications_unread_count(tenant)})
        from .notifications.dispatch import notifications_log_payload

        limit = min(int(request.query_params.get("limit", 100)), 500)
        return Response({"results": notifications_log_payload(tenant, limit=limit)})


class OperatorAttendanceHistoryView(APIView):
    permission_classes = [IsAuthenticated, SBOperatorPermission]

    def get(self, request):
        tenant = request.tenant
        if tenant is None:
            return Response({"detail": "Tenant required"}, status=400)
        limit = min(int(request.query_params.get("limit", 50)), 200)
        return Response({"results": services.operator_attendance_history_payload(tenant, limit=limit)})


class OperatorTripsTodayView(APIView):
    permission_classes = [IsAuthenticated, SBOperatorPermission]

    def get(self, request):
        tenant = request.tenant
        if tenant is None:
            return Response({"detail": "Tenant required"}, status=400)
        return Response(services.operator_trips_today_payload(tenant))


class OperatorTripsByDateView(APIView):
    permission_classes = [IsAuthenticated, SBOperatorPermission]

    def get(self, request):
        tenant = request.tenant
        if tenant is None:
            return Response({"detail": "Tenant required"}, status=400)
        from datetime import date as date_cls

        raw = request.query_params.get("date") or str(services._today())
        try:
            trip_date = date_cls.fromisoformat(raw)
        except ValueError:
            return Response({"detail": "Invalid date"}, status=400)
        return Response(services.operator_trips_by_date_payload(tenant, trip_date))


class OperatorAttendanceSummaryView(APIView):
    permission_classes = [IsAuthenticated, SBOperatorPermission]

    def get(self, request):
        tenant = request.tenant
        if tenant is None:
            return Response({"detail": "Tenant required"}, status=400)
        month = request.query_params.get("month") or services._today().strftime("%Y-%m")
        route = request.query_params.get("route", "all")
        return Response(services.operator_attendance_summary_payload(tenant, month, route))


class OperatorAttendanceExportView(APIView):
    permission_classes = [IsAuthenticated, SBOperatorPermission]

    def get(self, request):
        from django.http import HttpResponse

        tenant = request.tenant
        if tenant is None:
            return Response({"detail": "Tenant required"}, status=400)
        month = request.query_params.get("month") or services._today().strftime("%Y-%m")
        route = request.query_params.get("route", "all")
        csv_data = services.operator_attendance_export_csv(tenant, month, route)
        response = HttpResponse(csv_data, content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="attendance-{month}.csv"'
        return response


class OperatorFeeRemindView(APIView):
    permission_classes = [IsAuthenticated, SBOperatorPermission]

    def post(self, request, fee_id: int):
        tenant = request.tenant
        if tenant is None:
            return Response({"detail": "Tenant required"}, status=400)
        try:
            payload = services.operator_fee_remind_payload(tenant, fee_id)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(payload)


class DriverScheduleView(APIView):
    permission_classes = [IsAuthenticated, SBDriverPermission]

    def get(self, request):
        tenant = request.tenant
        driver = get_driver_for_user(request)
        if tenant is None or driver is None:
            return Response({"detail": "Driver profile required"}, status=400)
        try:
            days = int(request.query_params.get("days", "7"))
        except ValueError:
            return Response({"detail": "days must be an integer"}, status=400)
        return Response(services.driver_schedule_payload(tenant, driver, days=days))


class OperatorHolidaysView(APIView):
    permission_classes = [IsAuthenticated, SBOperatorPermission]

    def get(self, request):
        from datetime import date as date_cls

        tenant = request.tenant
        if tenant is None:
            return Response({"detail": "Tenant required"}, status=400)
        start = end = None
        raw_start = request.query_params.get("start_date")
        raw_end = request.query_params.get("end_date")
        try:
            if raw_start:
                start = date_cls.fromisoformat(str(raw_start))
            if raw_end:
                end = date_cls.fromisoformat(str(raw_end))
        except ValueError:
            return Response({"detail": "Invalid date"}, status=400)
        return Response({"holidays": services.operator_holidays_payload(tenant, start, end)})

    def post(self, request):
        from datetime import date as date_cls

        tenant = request.tenant
        if tenant is None:
            return Response({"detail": "Tenant required"}, status=400)
        raw_date = request.data.get("holiday_date")
        if not raw_date:
            return Response({"detail": "holiday_date required"}, status=400)
        try:
            holiday_date = date_cls.fromisoformat(str(raw_date))
        except ValueError:
            return Response({"detail": "Invalid holiday_date"}, status=400)
        name = str(request.data.get("name", ""))
        holiday = services.create_tenant_holiday(tenant, holiday_date, name=name)
        return Response(
            {
                "id": holiday.id,
                "holiday_date": str(holiday.holiday_date),
                "name": holiday.name or "Holiday",
            },
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request):
        tenant = request.tenant
        if tenant is None:
            return Response({"detail": "Tenant required"}, status=400)
        holiday_id = request.data.get("id") or request.query_params.get("id")
        if holiday_id is None:
            return Response({"detail": "id required"}, status=400)
        try:
            services.delete_tenant_holiday(tenant, int(holiday_id))
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=404)
        return Response(status=status.HTTP_204_NO_CONTENT)


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


class DriverTripLocationView(APIView):
    permission_classes = [IsAuthenticated, SBDriverPermission]

    def post(self, request, trip_id):
        tenant = request.tenant
        driver = get_driver_for_user(request)
        trip = Trip.objects.filter(tenant=tenant, id=trip_id, driver=driver).first()
        if trip is None:
            return Response({"detail": "Not found"}, status=404)
        lat = request.data.get("latitude")
        lng = request.data.get("longitude")
        if lat is None or lng is None:
            return Response({"detail": "latitude and longitude required"}, status=400)
        loc = services.record_trip_location(trip, Decimal(str(lat)), Decimal(str(lng)))
        return Response({"id": loc.id, "recorded_at": loc.recorded_at})


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
        return Response(
            {
                "trip_id": trip.id,
                "status": trip.status,
                "summary": trip.summary_json,
            }
        )


class DriverIncidentCreateView(APIView):
    permission_classes = [IsAuthenticated, SBDriverPermission]

    def post(self, request):
        tenant = request.tenant
        driver = get_driver_for_user(request)
        if tenant is None or driver is None:
            return Response({"detail": "Driver profile required"}, status=400)
        ser = IncidentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        trip = ser.validated_data.get("trip")
        if trip is not None:
            if (
                trip.tenant_id != tenant.id
                or not Trip.objects.filter(tenant=tenant, id=trip.id, driver=driver).exists()
            ):
                return Response({"detail": "Not found"}, status=404)
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


class WhatsAppWebhookView(APIView):
    """Phase 2 stub — Meta delivery receipts."""

    permission_classes = []
    authentication_classes = []

    def post(self, request):
        return Response({"ok": True})


class RazorpayWebhookView(APIView):
    """Phase 3 stub — mark fee paid from payment link webhook."""

    permission_classes = []
    authentication_classes = []

    def post(self, request):
        payment_link_id = request.data.get("payload", {}).get("payment_link", {}).get("entity", {}).get("id")
        if not payment_link_id:
            return Response({"detail": "ignored"}, status=200)
        fee = FeeRecord.objects.filter(razorpay_payment_link_id=payment_link_id).first()
        if fee and fee.status != FeeRecord.STATUS_PAID:
            services.record_fee_payment(fee, fee.amount, note="Razorpay webhook")
            fee.paid_via = "razorpay"
            fee.save(update_fields=["paid_via", "updated_at"])
        return Response({"ok": True})


# Legacy stub — redirect consumers to operator dashboard
class SchoolBusDashboardView(OperatorDashboardView):
    pass
