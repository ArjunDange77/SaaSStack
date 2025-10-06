from django.contrib import admin
from .models import Branding, Menu

@admin.register(Branding)
class BrandingAdmin(admin.ModelAdmin):
    list_display = ("id","name","tenant","is_active","updated_at")
    list_filter = ("is_active",)
    search_fields = ("name",)

@admin.register(Menu)
class MenuAdmin(admin.ModelAdmin):
    list_display = ("id","slug","title","tenant","is_active","version","updated_at")
    list_filter = ("is_active","version")
    search_fields = ("slug","title")
