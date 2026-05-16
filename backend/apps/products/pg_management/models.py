from django.conf import settings
from django.db import models

from apps.registry.models import TenantDomainModel


class Resident(TenantDomainModel):
    GENDER_CHOICES = [("male", "Male"), ("female", "Female"), ("other", "Other")]
    ID_PROOF_CHOICES = [
        ("aadhaar", "Aadhaar"),
        ("passport", "Passport"),
        ("driving_license", "Driving license"),
        ("other", "Other"),
    ]
    ONBOARDING_CHOICES = [
        ("pending", "Pending"),
        ("in_progress", "In progress"),
        ("completed", "Completed"),
    ]
    ACTIVE_CHOICES = [("active", "Active"), ("inactive", "Inactive")]

    full_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    gender = models.CharField(max_length=16, choices=GENDER_CHOICES, blank=True)
    emergency_contact = models.CharField(max_length=200, blank=True)
    id_proof_type = models.CharField(max_length=32, choices=ID_PROOF_CHOICES, blank=True)
    id_proof_number = models.CharField(max_length=64, blank=True)
    onboarding_status = models.CharField(max_length=32, choices=ONBOARDING_CHOICES, default="pending")
    active_status = models.CharField(max_length=16, choices=ACTIVE_CHOICES, default="active")
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="pg_resident_profile",
    )

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name


class Room(TenantDomainModel):
    STATUS_CHOICES = [
        ("available", "Available"),
        ("occupied", "Occupied"),
        ("maintenance", "Maintenance"),
    ]

    room_number = models.CharField(max_length=32)
    floor = models.CharField(max_length=16, blank=True)
    occupancy_limit = models.PositiveIntegerField(default=1)
    current_occupancy = models.PositiveIntegerField(default=0, editable=False)
    room_status = models.CharField(max_length=32, choices=STATUS_CHOICES, default="available")
    monthly_rent_per_bed = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    amenities = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["floor", "room_number"]
        unique_together = ("tenant", "room_number")

    def __str__(self):
        return f"{self.room_number} (floor {self.floor})"


class BedAssignment(TenantDomainModel):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("vacated", "Vacated"),
    ]

    resident = models.ForeignKey(Resident, on_delete=models.CASCADE, related_name="assignments")
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="assignments")
    assigned_date = models.DateField()
    vacated_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="active")

    class Meta:
        ordering = ["-assigned_date"]

    def __str__(self):
        return f"{self.resident} -> {self.room}"


class Document(TenantDomainModel):
    TYPE_CHOICES = [
        ("id_proof", "ID proof"),
        ("agreement", "Agreement"),
        ("photo", "Photo"),
        ("other", "Other"),
    ]
    VERIFICATION_CHOICES = [
        ("pending", "Pending"),
        ("verified", "Verified"),
        ("rejected", "Rejected"),
    ]

    resident = models.ForeignKey(Resident, on_delete=models.CASCADE, related_name="documents")
    document_type = models.CharField(max_length=32, choices=TYPE_CHOICES)
    uploaded_file = models.FileField(upload_to="pg_documents/%Y/%m/")
    verification_status = models.CharField(max_length=32, choices=VERIFICATION_CHOICES, default="pending")
    remarks = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.document_type} for {self.resident}"


class RentRecord(TenantDomainModel):
    PAID_CHOICES = [
        ("unpaid", "Unpaid"),
        ("paid", "Paid"),
        ("partial", "Partial"),
    ]
    PAYMENT_METHOD_CHOICES = [
        ("cash", "Cash"),
        ("upi", "UPI"),
        ("bank", "Bank transfer"),
        ("other", "Other"),
    ]

    resident = models.ForeignKey(Resident, on_delete=models.CASCADE, related_name="rent_records")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField()
    paid_status = models.CharField(max_length=16, choices=PAID_CHOICES, default="unpaid")
    paid_date = models.DateField(null=True, blank=True)
    payment_method = models.CharField(max_length=16, choices=PAYMENT_METHOD_CHOICES, blank=True)

    class Meta:
        ordering = ["-due_date"]

    def __str__(self):
        return f"Rent {self.amount} for {self.resident}"


class Complaint(TenantDomainModel):
    STATUS_CHOICES = [
        ("open", "Open"),
        ("in_progress", "In progress"),
        ("resolved", "Resolved"),
        ("closed", "Closed"),
    ]
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
    ]

    resident = models.ForeignKey(Resident, on_delete=models.CASCADE, related_name="complaints")
    title = models.CharField(max_length=200)
    description = models.TextField()
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default="open")
    priority = models.CharField(max_length=16, choices=PRIORITY_CHOICES, default="medium")
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="resolved_complaints",
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class BookingRequest(TenantDomainModel):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    full_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20)
    preferred_room = models.ForeignKey(
        Room,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="booking_requests",
    )
    duration = models.CharField(max_length=120, blank=True, help_text="e.g. 3 months")
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default="pending")
    remarks = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} ({self.status})"
