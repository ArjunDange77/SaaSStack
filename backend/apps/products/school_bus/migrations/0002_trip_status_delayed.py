from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("school_bus", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="trip",
            name="status",
            field=models.CharField(
                choices=[
                    ("scheduled", "Scheduled"),
                    ("started", "Started"),
                    ("pickup_in_progress", "Pickup in progress"),
                    ("completed", "Completed"),
                    ("incident_reported", "Incident reported"),
                    ("delayed", "Delayed"),
                ],
                default="scheduled",
                max_length=32,
            ),
        ),
    ]
