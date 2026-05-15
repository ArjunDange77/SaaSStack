from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tenancy", "0002_tenantmembership"),
    ]

    operations = [
        migrations.AlterField(
            model_name="tenantmembership",
            name="role",
            field=models.CharField(
                choices=[
                    ("owner", "Owner"),
                    ("staff", "Staff"),
                    ("resident", "Resident"),
                ],
                default="staff",
                max_length=32,
            ),
        ),
    ]
