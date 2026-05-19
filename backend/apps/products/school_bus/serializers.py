from rest_framework import serializers

from .models import (
    Bus,
    Driver,
    FeePayment,
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


class DriverSerializer(serializers.ModelSerializer):
    class Meta:
        model = Driver
        fields = (
            "id",
            "tenant",
            "full_name",
            "phone",
            "license_number",
            "emergency_contact",
            "joining_date",
            "status",
            "assigned_bus",
            "assigned_route",
            "user",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("tenant", "created_at", "updated_at")


class BusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bus
        fields = ("id", "tenant", "fleet_number", "capacity", "active", "created_at", "updated_at")
        read_only_fields = ("tenant", "created_at", "updated_at")


class RouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Route
        fields = (
            "id",
            "tenant",
            "name",
            "description",
            "direction",
            "active",
            "default_driver",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("tenant", "created_at", "updated_at")


class StopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stop
        fields = ("id", "tenant", "name", "address", "latitude", "longitude", "created_at", "updated_at")
        read_only_fields = ("tenant", "created_at", "updated_at")


class RouteStopSerializer(serializers.ModelSerializer):
    class Meta:
        model = RouteStop
        fields = ("id", "tenant", "route", "stop", "sequence", "estimated_time", "created_at", "updated_at")
        read_only_fields = ("tenant", "created_at", "updated_at")


class ParentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Parent
        fields = ("id", "tenant", "full_name", "phone", "email", "user", "created_at", "updated_at")
        read_only_fields = ("tenant", "created_at", "updated_at")


class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = (
            "id",
            "tenant",
            "full_name",
            "school_name",
            "class_grade",
            "pickup_stop",
            "drop_stop",
            "assigned_route",
            "assigned_bus",
            "parent",
            "fee_status",
            "emergency_notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("tenant", "created_at", "updated_at")
        extra_kwargs = {
            "full_name": {"label": "Full name"},
            "school_name": {"label": "School"},
            "class_grade": {"label": "Class / grade"},
            "pickup_stop": {"label": "Pickup stop"},
            "drop_stop": {"label": "Drop stop"},
            "assigned_route": {"label": "Route"},
            "assigned_bus": {"label": "Bus"},
            "parent": {"label": "Parent"},
            "fee_status": {"label": "Fee status"},
            "emergency_notes": {"label": "Emergency notes"},
        }


class TripSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trip
        fields = (
            "id",
            "tenant",
            "route",
            "bus",
            "driver",
            "trip_date",
            "status",
            "started_at",
            "completed_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("tenant", "created_at", "updated_at", "started_at", "completed_at")


class TripAttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = TripAttendance
        fields = (
            "id",
            "tenant",
            "trip",
            "student",
            "pickup_status",
            "drop_status",
            "marked_at",
            "marked_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("tenant", "marked_at", "marked_by", "created_at", "updated_at")


class FeeRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeRecord
        fields = (
            "id",
            "tenant",
            "student",
            "month",
            "amount",
            "due_date",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("tenant", "created_at", "updated_at")


class FeePaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeePayment
        fields = ("id", "tenant", "fee_record", "amount", "paid_at", "note", "created_at", "updated_at")
        read_only_fields = ("tenant", "paid_at", "created_at", "updated_at")


class IncidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incident
        fields = (
            "id",
            "tenant",
            "trip",
            "student",
            "severity",
            "category",
            "description",
            "photo",
            "reported_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("tenant", "reported_by", "created_at", "updated_at")


class ReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reminder
        fields = (
            "id",
            "tenant",
            "audience",
            "parent",
            "kind",
            "title",
            "body",
            "read_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("tenant", "read_at", "created_at", "updated_at")


class AttendanceMarkSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    pickup_status = serializers.ChoiceField(choices=TripAttendance.STATUS_CHOICES, required=False)
    drop_status = serializers.ChoiceField(choices=TripAttendance.STATUS_CHOICES, required=False)
    pickup_absent_reason = serializers.CharField(max_length=32, required=False, allow_blank=True)


class BulkAttendanceSerializer(serializers.Serializer):
    marks = AttendanceMarkSerializer(many=True)


class ReminderBroadcastSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=Reminder.KIND_CHOICES)
    title = serializers.CharField(max_length=200)
    body = serializers.CharField(required=False, allow_blank=True)
    parent_id = serializers.IntegerField(required=False, allow_null=True)


class FeePaymentCreateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    note = serializers.CharField(required=False, allow_blank=True)
