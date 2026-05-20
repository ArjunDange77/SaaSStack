from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tenancy", "0004_alter_tenantmembership_role"),
    ]

    operations = [
        migrations.AlterField(
            model_name="tenantmembership",
            name="role",
            field=models.CharField(
                choices=[
                    ("owner", "Owner"),
                    ("staff", "Staff"),
                    ("driver", "Driver"),
                    ("resident", "Resident"),
                    ("parent", "Parent"),
                ],
                default="staff",
                max_length=32,
            ),
        ),
    ]
