"""Optional Azure Application Insights wiring."""


def configure_app_insights():
    connection = ""
    try:
        from django.conf import settings

        connection = getattr(settings, "APPLICATIONINSIGHTS_CONNECTION_STRING", "")
    except Exception:
        return
    if not connection:
        return
    try:
        from azure.monitor.opentelemetry import configure_azure_monitor

        configure_azure_monitor(connection_string=connection)
    except ImportError:
        pass
