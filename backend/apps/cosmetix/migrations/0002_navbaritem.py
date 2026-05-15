import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tenancy", "0001_initial"),
        ("cosmetix", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="NavBarItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("label", models.CharField(max_length=120)),
                ("href", models.CharField(help_text="Internal path (e.g. /r/demo-items) or external URL", max_length=500)),
                (
                    "icon",
                    models.CharField(
                        blank=True,
                        help_text="Icon key for the React icon registry (e.g. home, list, box)",
                        max_length=64,
                    ),
                ),
                (
                    "resource_slug",
                    models.SlugField(
                        blank=True,
                        help_text="Optional registered resource slug for dynamic CRUD routes",
                        max_length=120,
                    ),
                ),
                ("sort_order", models.PositiveIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("open_in_new_tab", models.BooleanField(default=False)),
                (
                    "tenant",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="nav_items",
                        to="tenancy.tenant",
                    ),
                ),
            ],
            options={
                "ordering": ["sort_order", "label"],
            },
        ),
    ]
