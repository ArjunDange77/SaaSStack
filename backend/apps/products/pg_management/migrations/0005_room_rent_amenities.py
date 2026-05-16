from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("pg_management", "0004_alter_bookingrequest_tenant"),
    ]

    operations = [
        migrations.AddField(
            model_name="room",
            name="monthly_rent_per_bed",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name="room",
            name="amenities",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
