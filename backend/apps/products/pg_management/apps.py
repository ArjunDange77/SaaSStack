from django.apps import AppConfig


class PgManagementConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.products.pg_management"
    label = "pg_management"
    verbose_name = "PG Management"

    def ready(self):
        from apps.registry.product import ProductConfig, ProductRegistry

        from .resource_registration import register_pg_resources

        ProductRegistry.register(
            ProductConfig(
                slug="pg_management",
                label="PG Management",
                url_prefix="/api/pg/",
                roles=["operator", "staff", "resident"],
                default_operator_role="owner",
                nav_sections=[
                    {"label": "Command center", "href": "/dashboard", "section": "TODAY", "icon": "home", "roles": ["operator"]},
                    {"label": "Residents", "href": "/r/pg-residents", "section": "MANAGE", "icon": "user", "roles": ["operator"]},
                    {"label": "Rooms", "href": "/r/pg-rooms", "section": "MANAGE", "icon": "bed", "roles": ["operator"]},
                ],
                seed_command="seed_pg",
                demo_tenant_slug="pg-demo",
            )
        )
        register_pg_resources()
