from django.contrib import admin

from .models import BedAssignment, Complaint, Document, RentRecord, Resident, Room


@admin.register(Resident)
class ResidentAdmin(admin.ModelAdmin):
    list_display = ("full_name", "phone", "tenant", "onboarding_status", "active_status")
    list_filter = ("tenant", "onboarding_status", "active_status")


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("room_number", "floor", "tenant", "current_occupancy", "room_status")


@admin.register(BedAssignment)
class BedAssignmentAdmin(admin.ModelAdmin):
    list_display = ("resident", "room", "status", "assigned_date", "tenant")


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("resident", "document_type", "verification_status", "tenant")


@admin.register(RentRecord)
class RentRecordAdmin(admin.ModelAdmin):
    list_display = ("resident", "amount", "due_date", "paid_status", "tenant")


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ("title", "resident", "status", "priority", "tenant")
