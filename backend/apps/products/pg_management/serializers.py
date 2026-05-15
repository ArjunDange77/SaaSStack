from rest_framework import serializers

from .models import BedAssignment, Complaint, Document, RentRecord, Resident, Room
from .services import validate_assignment


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
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        )

    def get_occupancy_display(self, obj):
        return f"{obj.current_occupancy}/{obj.occupancy_limit}"


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
