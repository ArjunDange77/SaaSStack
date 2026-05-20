from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("school_bus", "0003_goa_pilot_extras"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = []
    for model_name in ("triplocation", "tenantmessagingconfig", "outboundmessage"):
        operations.extend(
            [
                migrations.AddField(
                    model_name=model_name,
                    name="created_by",
                    field=models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                migrations.AddField(
                    model_name=model_name,
                    name="updated_by",
                    field=models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                migrations.AddField(
                    model_name=model_name,
                    name="is_active",
                    field=models.BooleanField(default=True),
                ),
                migrations.AddField(
                    model_name=model_name,
                    name="deleted_at",
                    field=models.DateTimeField(blank=True, null=True),
                ),
            ]
        )
