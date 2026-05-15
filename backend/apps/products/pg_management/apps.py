from django.apps import AppConfig


class PgManagementConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.products.pg_management"
    label = "pg_management"
    verbose_name = "PG Management"

    def ready(self):
        from .resource_registration import register_pg_resources

        register_pg_resources()
