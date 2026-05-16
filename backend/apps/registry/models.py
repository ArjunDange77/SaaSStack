from django.conf import settings
from django.db import models
from django.utils import timezone


class TenantAuditedModel(models.Model):
    """Kernel convention: tenant scope + audit columns for all product domain models."""

    tenant = models.ForeignKey(
        "tenancy.Tenant",
        on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s_set",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )

    class Meta:
        abstract = True


class SoftDeleteMixin(models.Model):
    """Soft-delete flags shared by all tenant domain models."""

    is_active = models.BooleanField(default=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True


class SoftDeleteQuerySet(models.QuerySet):
    def alive(self):
        return self.filter(deleted_at__isnull=True)


class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db)

    def alive(self):
        return self.get_queryset().alive()


class TenantDomainModel(TenantAuditedModel, SoftDeleteMixin):
    """
    Standard base for product domain models: tenant scope, audit columns, soft delete.
    Engine ViewSets auto-filter deleted rows; use Model.objects.alive() in services.
    """

    objects = SoftDeleteManager()

    class Meta:
        abstract = True


class ActivityLog(models.Model):
    """Generic operational timeline — reusable across verticals."""

    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.CASCADE, related_name="activity_logs")
    resource_slug = models.CharField(max_length=120, db_index=True)
    object_id = models.CharField(max_length=64, db_index=True)
    verb = models.CharField(max_length=64, db_index=True)
    message = models.CharField(max_length=500)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="activity_logs",
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.verb} {self.resource_slug}:{self.object_id}"
