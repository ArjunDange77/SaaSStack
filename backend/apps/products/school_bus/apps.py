from django.apps import AppConfig


class SchoolBusConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.products.school_bus"
    label = "school_bus"
    verbose_name = "School Bus Management"

    def ready(self):
        from apps.registry.notifications import LogAdapter
        from apps.registry.product import ProductConfig, ProductRegistry

        from .resource_registration import register_school_bus_resources

        ProductRegistry.register(
            ProductConfig(
                slug="school_bus",
                label="School Bus",
                url_prefix="/api/sb/",
                roles=["operator", "driver", "parent"],
                default_operator_role="owner",
                nav_sections=[
                    {"label": "Command center", "href": "/sb/dashboard", "section": "TODAY", "icon": "home", "roles": ["operator"]},
                    {"label": "Today's trips", "href": "/sb/trips", "section": "TODAY", "icon": "bus", "roles": ["operator"]},
                    {"label": "Attendance", "href": "/sb/attendance", "section": "TODAY", "icon": "list", "roles": ["operator"]},
                    {"label": "Students", "href": "/r/sb-students", "section": "MANAGE", "icon": "user", "roles": ["operator"]},
                ],
                seed_command="seed_goa_pilot",
                demo_tenant_slug="sai-baba-school-bus",
                notification_adapter=LogAdapter,
            )
        )
        register_school_bus_resources()
