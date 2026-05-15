import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("tenancy", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="DemoItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=200)),
                ("sku", models.CharField(blank=True, max_length=64)),
                (
                    "category",
                    models.CharField(
                        choices=[("parts", "Parts"), ("kits", "Kits"), ("services", "Services")],
                        default="parts",
                        max_length=32,
                    ),
                ),
                ("price", models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("in_stock", models.BooleanField(default=True)),
                ("notes", models.TextField(blank=True)),
                ("archived", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="demo_items",
                        to="tenancy.tenant",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
