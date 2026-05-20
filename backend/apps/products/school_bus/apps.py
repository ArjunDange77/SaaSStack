from django.apps import AppConfig


class SchoolBusConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.products.school_bus"
    label = "school_bus"
    verbose_name = "School Bus Management"

    def ready(self):
        from .resource_registration import register_school_bus_resources

        register_school_bus_resources()
