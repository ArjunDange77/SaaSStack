from rest_framework import serializers

from .models import BedAssignment, BookingRequest, Complaint, Document, RentRecord, Resident, Room
from .services import validate_assignment


def room_occupancy_display(room: Room) -> str:
    return f"{room.current_occupancy}/{room.occupancy_limit}"


def room_availability_label(room: Room) -> str:
    if room.room_status == "maintenance":
        return "Maintenance"
    if room.current_occupancy >= room.occupancy_limit:
        return "Full"
    if room.room_status == "available":
        return "Available"
    return "Occupied"


def room_sharing_label(room: Room) -> str:
    return "Single" if room.occupancy_limit <= 1 else "Shared"


class ResidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resident
        fields = (
            "id",
            "tenant",
            "full_name",
            "phone",
            "email",
            "gender",
            "emergency_contact",
            "id_proof_type",
            "id_proof_number",
            "onboarding_status",
            "active_status",
            "is_active",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        )
        read_only_fields = ("id", "tenant", "created_at", "updated_at", "created_by", "updated_by")

    def validate_phone(self, value):
        tenant = self.context.get("tenant")
        if not tenant:
            return value
        qs = Resident.objects.filter(tenant=tenant, phone=value, deleted_at__isnull=True)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A resident with this phone already exists.")
        return value


class RoomSerializer(serializers.ModelSerializer):
    occupancy_display = serializers.SerializerMethodField()
    availability_label = serializers.SerializerMethodField()
    sharing_label = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = (
            "id",
            "tenant",
            "room_number",
            "floor",
            "occupancy_limit",
            "current_occupancy",
            "occupancy_display",
            "availability_label",
            "sharing_label",
            "room_status",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        )
        read_only_fields = (
            "id",
            "tenant",
            "current_occupancy",
            "occupancy_display",
            "availability_label",
            "sharing_label",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        )

    def get_occupancy_display(self, obj):
        return room_occupancy_display(obj)

    def get_availability_label(self, obj):
        return room_availability_label(obj)

    def get_sharing_label(self, obj):
        return room_sharing_label(obj)


class BedAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = BedAssignment
        fields = (
            "id",
            "tenant",
            "resident",
            "room",
            "assigned_date",
            "vacated_date",
            "status",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        )
        read_only_fields = ("id", "tenant", "created_at", "updated_at", "created_by", "updated_by")

    def validate(self, attrs):
        resident = attrs.get("resident") or (self.instance and self.instance.resident)
        room = attrs.get("room") or (self.instance and self.instance.room)
        status = attrs.get("status", getattr(self.instance, "status", "active"))
        tenant = self.context.get("tenant")
        if resident and room and status == "active" and tenant:
            try:
                validate_assignment(
                    tenant=tenant,
                    resident=resident,
                    room=room,
                    exclude_pk=self.instance.pk if self.instance else None,
                )
            except Exception as e:
                raise serializers.ValidationError(str(e)) from e
        return attrs


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = (
            "id",
            "tenant",
            "resident",
            "document_type",
            "uploaded_file",
            "verification_status",
            "remarks",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        )
        read_only_fields = ("id", "tenant", "created_at", "updated_at", "created_by", "updated_by")


class RentRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = RentRecord
        fields = (
            "id",
            "tenant",
            "resident",
            "amount",
            "due_date",
            "paid_status",
            "paid_date",
            "payment_method",
            "is_active",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        )
        read_only_fields = ("id", "tenant", "created_at", "updated_at", "created_by", "updated_by")


class ComplaintSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = (
            "id",
            "tenant",
            "resident",
            "title",
            "description",
            "status",
            "priority",
            "resolved_by",
            "resolved_at",
            "is_active",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        )
        read_only_fields = (
            "id",
            "tenant",
            "resolved_by",
            "resolved_at",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        )


class BookingRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingRequest
        fields = (
            "id",
            "tenant",
            "full_name",
            "phone",
            "preferred_room",
            "duration",
            "status",
            "remarks",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "tenant", "status", "created_at", "updated_at")


class PublicRoomSerializer(serializers.ModelSerializer):
    occupancy_display = serializers.SerializerMethodField()
    availability_label = serializers.SerializerMethodField()
    sharing_label = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = (
            "id",
            "room_number",
            "floor",
            "occupancy_limit",
            "current_occupancy",
            "occupancy_display",
            "availability_label",
            "sharing_label",
            "room_status",
        )

    def get_occupancy_display(self, obj):
        return room_occupancy_display(obj)

    def get_availability_label(self, obj):
        return room_availability_label(obj)

    def get_sharing_label(self, obj):
        return room_sharing_label(obj)


class PublicBookingSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=200)
    phone = serializers.CharField(max_length=20)
    preferred_room = serializers.PrimaryKeyRelatedField(
        queryset=Room.objects.none(),
        required=False,
        allow_null=True,
    )
    duration = serializers.CharField(max_length=120)
    remarks = serializers.CharField(required=False, allow_blank=True, max_length=500)
    website = serializers.CharField(required=False, allow_blank=True, write_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        tenant = self.context.get("tenant")
        if tenant is not None:
            self.fields["preferred_room"].queryset = Room.objects.filter(
                tenant=tenant,
                room_status="available",
            ).extra(where=["current_occupancy < occupancy_limit"])

    def validate_full_name(self, value):
        from .validators import validate_public_full_name

        return validate_public_full_name(value)

    def validate_phone(self, value):
        from .validators import validate_public_phone

        return validate_public_phone(value)

    def validate_duration(self, value):
        from .validators import validate_public_duration

        return validate_public_duration(value)

    def validate_remarks(self, value):
        from .validators import validate_public_remarks

        return validate_public_remarks(value)

    def validate_website(self, value):
        if (value or "").strip():
            raise serializers.ValidationError("Invalid submission.")
        return ""

    def validate_preferred_room(self, room):
        if room is None:
            return room
        tenant = self.context.get("tenant")
        if tenant is None or room.tenant_id != tenant.id:
            raise serializers.ValidationError("Selected room is not available.")
        if room.room_status != "available":
            raise serializers.ValidationError("Selected room is not available.")
        if room.current_occupancy >= room.occupancy_limit:
            raise serializers.ValidationError("Selected room is fully occupied.")
        return room


class StaffInviteSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)
    email = serializers.EmailField(required=False, allow_blank=True)
