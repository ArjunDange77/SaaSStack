from django.contrib import admin

from .models import DemoItem


@admin.register(DemoItem)
class DemoItemAdmin(admin.ModelAdmin):
    list_display = ("id", "tenant", "name", "sku", "category", "price", "in_stock", "archived")
    list_filter = ("tenant", "category", "archived")
