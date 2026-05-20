from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.registry.models import TenantDomainModel


class Driver(TenantDomainModel):
    STATUS_ACTIVE = "active"
    STATUS_INACTIVE = "inactive"
    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_INACTIVE, "Inactive"),
    ]

    full_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20, blank=True)
    license_number = models.CharField(max_length=64, blank=True)
    emergency_contact = models.CharField(max_length=200, blank=True)
    joining_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    assigned_bus = models.ForeignKey(
        "Bus",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_drivers",
    )
    assigned_route = models.ForeignKey(
        "Route",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_drivers",
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="school_bus_driver_profile",
    )

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name


class Bus(TenantDomainModel):
    fleet_number = models.CharField(max_length=32)
    capacity = models.PositiveIntegerField(default=40)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["fleet_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "fleet_number"],
                name="school_bus_unique_fleet_per_tenant",
            )
        ]

    def __str__(self):
        return self.fleet_number


class Route(TenantDomainModel):
    DIRECTION_MORNING = "morning"
    DIRECTION_EVENING = "evening"
    DIRECTION_CHOICES = [
        (DIRECTION_MORNING, "Morning"),
        (DIRECTION_EVENING, "Evening"),
    ]

    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    direction = models.CharField(max_length=16, choices=DIRECTION_CHOICES, default=DIRECTION_MORNING)
    active = models.BooleanField(default=True)
    default_driver = models.ForeignKey(
        Driver,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="default_routes",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Stop(TenantDomainModel):
    name = models.CharField(max_length=120)
    address = models.CharField(max_length=255, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class RouteStop(TenantDomainModel):
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name="route_stops")
    stop = models.ForeignKey(Stop, on_delete=models.CASCADE, related_name="route_stops")
    sequence = models.PositiveIntegerField(default=1)
    estimated_time = models.TimeField(null=True, blank=True)

    class Meta:
        ordering = ["route", "sequence"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "route", "sequence"],
                name="school_bus_unique_route_sequence",
            ),
            models.UniqueConstraint(
                fields=["tenant", "route", "stop"],
                name="school_bus_unique_route_stop",
            ),
        ]

    def __str__(self):
        return f"{self.route.name} #{self.sequence} {self.stop.name}"


class Parent(TenantDomainModel):
    full_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="school_bus_parent_profile",
    )

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name


class Student(TenantDomainModel):
    FEE_PAID = "paid"
    FEE_UNPAID = "unpaid"
    FEE_PARTIAL = "partial"
    FEE_STATUS_CHOICES = [
        (FEE_PAID, "Paid"),
        (FEE_UNPAID, "Unpaid"),
        (FEE_PARTIAL, "Partial"),
    ]

    full_name = models.CharField(max_length=200)
    school_name = models.CharField(max_length=200, blank=True)
    class_grade = models.CharField(max_length=32, blank=True)
    pickup_stop = models.ForeignKey(
        Stop,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="pickup_students",
    )
    drop_stop = models.ForeignKey(
        Stop,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="drop_students",
    )
    assigned_route = models.ForeignKey(
        Route,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="students",
    )
    assigned_bus = models.ForeignKey(
        Bus,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="students",
    )
    parent = models.ForeignKey(
        Parent,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="children",
    )
    fee_status = models.CharField(max_length=16, choices=FEE_STATUS_CHOICES, default=FEE_UNPAID)
    emergency_notes = models.TextField(blank=True)

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name


class Trip(TenantDomainModel):
    STATUS_SCHEDULED = "scheduled"
    STATUS_STARTED = "started"
    STATUS_PICKUP_IN_PROGRESS = "pickup_in_progress"
    STATUS_COMPLETED = "completed"
    STATUS_INCIDENT_REPORTED = "incident_reported"
    STATUS_DELAYED = "delayed"
    STATUS_CHOICES = [
        (STATUS_SCHEDULED, "Scheduled"),
        (STATUS_STARTED, "Started"),
        (STATUS_PICKUP_IN_PROGRESS, "Pickup in progress"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_INCIDENT_REPORTED, "Incident reported"),
        (STATUS_DELAYED, "Delayed"),
    ]

    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name="trips")
    bus = models.ForeignKey(Bus, on_delete=models.CASCADE, related_name="trips")
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name="trips")
    trip_date = models.DateField(default=timezone.localdate)
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default=STATUS_SCHEDULED)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    summary_json = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ["-trip_date", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "route", "bus", "driver", "trip_date"],
                name="school_bus_unique_trip_per_day",
            )
        ]

    def __str__(self):
        return f"{self.route.name} {self.trip_date}"


class TripAttendance(TenantDomainModel):
    PRESENT = "present"
    ABSENT = "absent"
    NOT_MARKED = "not_marked"
    STATUS_CHOICES = [
        (PRESENT, "Present"),
        (ABSENT, "Absent"),
        (NOT_MARKED, "Not marked"),
    ]

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="attendance_records")
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="attendance_records")
    pickup_status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=NOT_MARKED)
    drop_status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=NOT_MARKED)
    pickup_absent_reason = models.CharField(max_length=32, blank=True)
    marked_at = models.DateTimeField(null=True, blank=True)
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="marked_attendance",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "trip", "student"],
                name="school_bus_unique_trip_student_attendance",
            )
        ]

    def __str__(self):
        return f"{self.student} on {self.trip}"


class FeeRecord(TenantDomainModel):
    STATUS_PAID = "paid"
    STATUS_UNPAID = "unpaid"
    STATUS_PARTIAL = "partial"
    STATUS_CHOICES = [
        (STATUS_PAID, "Paid"),
        (STATUS_UNPAID, "Unpaid"),
        (STATUS_PARTIAL, "Partial"),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="fee_records")
    month = models.CharField(max_length=7, help_text="YYYY-MM")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField()
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_UNPAID)
    razorpay_payment_link_id = models.CharField(max_length=128, blank=True)
    payment_link_url = models.URLField(blank=True)
    paid_via = models.CharField(
        max_length=16,
        choices=[("manual", "Manual"), ("razorpay", "Razorpay")],
        default="manual",
        blank=True,
    )

    class Meta:
        ordering = ["-month", "student__full_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "student", "month"],
                name="school_bus_unique_fee_per_month",
            )
        ]

    def __str__(self):
        return f"{self.student} {self.month}"


class FeePayment(TenantDomainModel):
    fee_record = models.ForeignKey(FeeRecord, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_at = models.DateTimeField(default=timezone.now)
    note = models.CharField(max_length=255, blank=True)
    paid_via = models.CharField(max_length=16, blank=True, default="manual")

    class Meta:
        ordering = ["-paid_at"]


class Incident(TenantDomainModel):
    SEVERITY_LOW = "low"
    SEVERITY_MEDIUM = "medium"
    SEVERITY_HIGH = "high"
    SEVERITY_CHOICES = [
        (SEVERITY_LOW, "Low"),
        (SEVERITY_MEDIUM, "Medium"),
        (SEVERITY_HIGH, "High"),
    ]

    trip = models.ForeignKey(Trip, null=True, blank=True, on_delete=models.SET_NULL, related_name="incidents")
    student = models.ForeignKey(
        Student,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="incidents",
    )
    severity = models.CharField(max_length=16, choices=SEVERITY_CHOICES, default=SEVERITY_MEDIUM)
    category = models.CharField(max_length=64, blank=True)
    description = models.TextField()
    photo = models.FileField(upload_to="sb_incidents/%Y/%m/", blank=True)
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reported_sb_incidents",
    )

    class Meta:
        ordering = ["-created_at"]


class Reminder(TenantDomainModel):
    KIND_FEE_DUE = "fee_due"
    KIND_ROUTE_DELAY = "route_delay"
    KIND_INCIDENT = "incident"
    KIND_HOLIDAY = "holiday"
    KIND_CHOICES = [
        (KIND_FEE_DUE, "Fee due"),
        (KIND_ROUTE_DELAY, "Route delay"),
        (KIND_INCIDENT, "Incident"),
        (KIND_HOLIDAY, "Holiday"),
    ]
    AUDIENCE_ALL = "all"
    AUDIENCE_PARENT = "parent"
    AUDIENCE_CHOICES = [
        (AUDIENCE_ALL, "All parents"),
        (AUDIENCE_PARENT, "Single parent"),
    ]

    audience = models.CharField(max_length=16, choices=AUDIENCE_CHOICES, default=AUDIENCE_ALL)
    parent = models.ForeignKey(
        Parent,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="reminders",
    )
    kind = models.CharField(max_length=32, choices=KIND_CHOICES)
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]


class TenantHoliday(TenantDomainModel):
    """Tenant-wide non-school days; trip generation skips these dates."""

    holiday_date = models.DateField()
    name = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["holiday_date"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "holiday_date"],
                name="school_bus_unique_tenant_holiday_date",
            )
        ]

    def __str__(self):
        return f"{self.holiday_date} {self.name or 'Holiday'}"


class TripLocation(TenantDomainModel):
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="locations")
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    recorded_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-recorded_at"]


class TenantMessagingConfig(TenantDomainModel):
    demo_mode = models.BooleanField(default=True)
    whatsapp_phone_number_id = models.CharField(max_length=64, blank=True)
    whatsapp_access_token = models.CharField(max_length=512, blank=True)
    razorpay_key_id = models.CharField(max_length=128, blank=True)
    razorpay_key_secret = models.CharField(max_length=256, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["tenant"],
                name="school_bus_unique_messaging_config_per_tenant",
            )
        ]


class OutboundMessage(TenantDomainModel):
    STATUS_PENDING = "pending"
    STATUS_SENT = "sent"
    STATUS_FAILED = "failed"
    STATUS_DEMO = "demo"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_SENT, "Sent"),
        (STATUS_FAILED, "Failed"),
        (STATUS_DEMO, "Demo"),
    ]

    channel = models.CharField(max_length=32, default="whatsapp")
    event_type = models.CharField(max_length=64)
    to_phone = models.CharField(max_length=20)
    student = models.ForeignKey(Student, null=True, blank=True, on_delete=models.SET_NULL)
    template_key = models.CharField(max_length=64, blank=True)
    body = models.TextField(blank=True)
    payload_json = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_PENDING)
    provider_ref = models.CharField(max_length=512, blank=True)
    error = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
