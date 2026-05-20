import pytest

from apps.products.pg_management.models import Resident


@pytest.mark.django_db
def test_pg_resident_cross_tenant_detail_404(pg_member, pg_tenant, tenant_b):
    resident = Resident.objects.create(
        tenant=pg_tenant, full_name="Secret", phone="1111111111"
    )
    pg_member.credentials(HTTP_X_TENANT=tenant_b.slug)
    response = pg_member.get(f"/api/meta/resources/pg-residents/{resident.pk}/")
    assert response.status_code in (403, 404)
