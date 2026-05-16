from rest_framework import serializers

from .models import Branding, Menu, NavBarItem

class BrandingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branding
        fields = ("id","tenant","name","logo_url","favicon_url","css_vars","is_active","updated_at")

class MenuSerializer(serializers.ModelSerializer):
    class Meta:
        model = Menu
        fields = ("id","tenant","slug","title","structure","is_active","version","updated_by","updated_at")
        read_only_fields = ("id","version","updated_at")


class NavBarItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = NavBarItem
        fields = (
            "id",
            "label",
            "href",
            "icon",
            "resource_slug",
            "sort_order",
            "nav_group",
            "open_in_new_tab",
        )
