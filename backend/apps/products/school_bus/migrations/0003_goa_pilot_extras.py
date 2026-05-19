from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [
        ("school_bus", "0002_trip_status_delayed"),
    ]

    operations = [
        migrations.AddField(
            model_name="tripattendance",
            name="pickup_absent_reason",
            field=models.CharField(blank=True, max_length=32),
        ),
        migrations.AddField(
            model_name="feerecord",
            name="paid_via",
            field=models.CharField(blank=True, default="manual", max_length=16),
        ),
        migrations.AddField(
            model_name="feerecord",
            name="payment_link_url",
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name="feerecord",
            name="razorpay_payment_link_id",
            field=models.CharField(blank=True, max_length=128),
        ),
        migrations.AddField(
            model_name="feepayment",
            name="paid_via",
            field=models.CharField(blank=True, default="manual", max_length=16),
        ),
        migrations.CreateModel(
            name="TripLocation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("latitude", models.DecimalField(decimal_places=6, max_digits=9)),
                ("longitude", models.DecimalField(decimal_places=6, max_digits=9)),
                ("recorded_at", models.DateTimeField(default=django.utils.timezone.now)),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="%(class)s_set",
                        to="tenancy.tenant",
                    ),
                ),
                (
                    "trip",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="locations",
                        to="school_bus.trip",
                    ),
                ),
            ],
            options={
                "ordering": ["-recorded_at"],
            },
        ),
        migrations.CreateModel(
            name="TenantMessagingConfig",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("demo_mode", models.BooleanField(default=True)),
                ("whatsapp_phone_number_id", models.CharField(blank=True, max_length=64)),
                ("whatsapp_access_token", models.CharField(blank=True, max_length=512)),
                ("razorpay_key_id", models.CharField(blank=True, max_length=128)),
                ("razorpay_key_secret", models.CharField(blank=True, max_length=256)),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="%(class)s_set",
                        to="tenancy.tenant",
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="tenantmessagingconfig",
            constraint=models.UniqueConstraint(
                fields=("tenant",),
                name="school_bus_unique_messaging_config_per_tenant",
            ),
        ),
        migrations.CreateModel(
            name="OutboundMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("channel", models.CharField(default="whatsapp", max_length=32)),
                ("event_type", models.CharField(max_length=64)),
                ("to_phone", models.CharField(max_length=20)),
                ("template_key", models.CharField(blank=True, max_length=64)),
                ("body", models.TextField(blank=True)),
                ("payload_json", models.JSONField(blank=True, default=dict)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("sent", "Sent"),
                            ("failed", "Failed"),
                            ("demo", "Demo"),
                        ],
                        default="pending",
                        max_length=16,
                    ),
                ),
                ("provider_ref", models.CharField(blank=True, max_length=512)),
                ("error", models.TextField(blank=True)),
                (
                    "student",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="school_bus.student",
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="%(class)s_set",
                        to="tenancy.tenant",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
