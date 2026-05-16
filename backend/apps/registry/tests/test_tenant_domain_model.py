import pytest

from apps.registry.models import SoftDeleteMixin, TenantAuditedModel, TenantDomainModel


@pytest.mark.django_db
def test_tenant_domain_model_includes_audit_and_soft_delete_fields():
    field_names = {f.name for f in TenantDomainModel._meta.get_fields()}
    for name in (
        "tenant",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "is_active",
        "deleted_at",
    ):
        assert name in field_names


def test_tenant_domain_model_mro():
    assert issubclass(TenantDomainModel, TenantAuditedModel)
    assert issubclass(TenantDomainModel, SoftDeleteMixin)
