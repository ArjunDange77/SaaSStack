from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("cosmetix", "0002_navbaritem"),
    ]

    operations = [
        migrations.AddField(
            model_name="navbaritem",
            name="nav_group",
            field=models.CharField(
                blank=True,
                help_text="Sidebar section label key (e.g. core, operations)",
                max_length=64,
            ),
        ),
    ]
