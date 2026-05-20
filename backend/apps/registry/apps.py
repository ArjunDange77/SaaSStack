from django.apps import AppConfig


class RegistryConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.registry"
    label = "registry"
    verbose_name = "SaaSStack registry"

    def ready(self):
        from apps.registry.constants import KERNEL_USER_RESOURCE_SLUG
        from apps.registry.registry import get_resource, register_resource
        from apps.registry.users import KernelUserViewSet

        if get_resource(KERNEL_USER_RESOURCE_SLUG) is None:
            register_resource(
                KERNEL_USER_RESOURCE_SLUG,
                KernelUserViewSet,
                title="Users",
                description="Operator accounts (label lookup)",
                catalog_hidden=True,
            )
