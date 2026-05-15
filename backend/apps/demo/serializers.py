from rest_framework import serializers

from .models import DemoItem


class DemoItemSerializer(serializers.ModelSerializer):
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        style={"base_template": "textarea.html"},
    )

    class Meta:
        model = DemoItem
        fields = (
            "id",
            "tenant",
            "name",
            "sku",
            "category",
            "price",
            "in_stock",
            "notes",
            "archived",
            "created_at",
        )
        read_only_fields = ("id", "tenant", "created_at", "archived")
