from django.apps import AppConfig


class DemoConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.demo"
    label = "demo"
    verbose_name = "Kernel demo (validation only)"

    def ready(self):
        from .resource_registration import register_engine_resources

        register_engine_resources()
