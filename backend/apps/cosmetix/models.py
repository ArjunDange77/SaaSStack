from django.db import models
from django.conf import settings

try:
    from django.db.models import JSONField as DJJSONField
except Exception:
    from django.contrib.postgres.fields import JSONField as DJJSONField

class Branding(models.Model):
    tenant = models.ForeignKey("tenancy.Tenant", null=True, blank=True, on_delete=models.CASCADE, related_name="brandings")
    name = models.CharField(max_length=150)
    logo_url = models.URLField(blank=True, null=True)
    favicon_url = models.URLField(blank=True, null=True)
    css_vars = DJJSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("tenant", "name")

    def __str__(self):
        return f"{self.name} (tenant={self.tenant})"


class Menu(models.Model):
    tenant = models.ForeignKey("tenancy.Tenant", null=True, blank=True, on_delete=models.CASCADE, related_name="menus")
    slug = models.SlugField(max_length=120)
    title = models.CharField(max_length=200)
    structure = DJJSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    version = models.IntegerField(default=1)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("tenant", "slug")

    def __str__(self):
        return f"{self.slug} (tenant={self.tenant})"
