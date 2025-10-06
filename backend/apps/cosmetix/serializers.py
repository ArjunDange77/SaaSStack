from rest_framework import serializers
from .models import Branding, Menu

class BrandingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branding
        fields = ("id","tenant","name","logo_url","favicon_url","css_vars","is_active","updated_at")

class MenuSerializer(serializers.ModelSerializer):
    class Meta:
        model = Menu
        fields = ("id","tenant","slug","title","structure","is_active","version","updated_by","updated_at")
        read_only_fields = ("id","version","updated_at")
