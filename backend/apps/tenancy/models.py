from django.db import models
from django.utils.text import slugify

class Tenant(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=100, unique=True)
    domain = models.CharField(max_length=255, blank=True, null=True, help_text="Optional domain for host-based routing (e.g. acme.example.com)")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.slug})"


class TenantMembership(models.Model):
    """Links users to tenants with a simple role (extensible for RBAC later)."""

    ROLE_OWNER = "owner"
    ROLE_STAFF = "staff"
    ROLE_DRIVER = "driver"
    ROLE_RESIDENT = "resident"
    ROLE_PARENT = "parent"
    ROLE_CHOICES = [
        (ROLE_OWNER, "Owner"),
        (ROLE_STAFF, "Staff"),
        (ROLE_DRIVER, "Driver"),
        (ROLE_RESIDENT, "Resident"),
        (ROLE_PARENT, "Parent"),
    ]

    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="tenant_memberships",
    )
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.CharField(max_length=32, choices=ROLE_CHOICES, default=ROLE_STAFF)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "tenant")
        ordering = ["tenant__name", "user__username"]

    def __str__(self):
        return f"{self.user} @ {self.tenant} ({self.role})"
