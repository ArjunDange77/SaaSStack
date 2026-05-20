from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("pg_management", "0006_soft_delete_domain_models"),
    ]

    operations = [
        migrations.AddField(
            model_name="bookingrequest",
            name="email",
            field=models.EmailField(blank=True, max_length=254),
        ),
    ]
