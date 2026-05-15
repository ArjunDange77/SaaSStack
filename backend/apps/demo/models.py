from django.db import models

from apps.tenancy.models import Tenant


class DemoItem(models.Model):
    """Validation model for the platform kernel — not a product feature."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="demo_items")
    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=64, blank=True)
    category = models.CharField(
        max_length=32,
        choices=[("parts", "Parts"), ("kits", "Kits"), ("services", "Services")],
        default="parts",
    )
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    in_stock = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name
