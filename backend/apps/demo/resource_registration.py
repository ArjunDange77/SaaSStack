from apps.registry.registry import get_resource, register_resource

from .views import DemoItemViewSet


def register_engine_resources() -> None:
    if get_resource("demo-items") is not None:
        return
    register_resource(
        "demo-items",
        DemoItemViewSet,
        title="Demo catalog",
        description="Kernel validation resource (tenant-scoped).",
    )
