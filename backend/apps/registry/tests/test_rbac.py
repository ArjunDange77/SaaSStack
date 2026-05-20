"""Tests for shared capability RBAC."""

import pytest
from rest_framework.permissions import SAFE_METHODS
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView

from apps.registry.rbac import CapabilityResourcePermission, STANDARD_ACTIONS
from apps.products.pg_management.rbac import can_access_resource as pg_can_access
from apps.products.pg_management.rbac import rules_for_role as pg_rules
from apps.products.school_bus.rbac import can_access_resource as sb_can_access
from apps.products.school_bus.rbac import rules_for_role as sb_rules


class _PgPermission(CapabilityResourcePermission):
    rules_for_role = staticmethod(pg_rules)
    can_access_resource = staticmethod(pg_can_access)


class _SbPermission(CapabilityResourcePermission):
    rules_for_role = staticmethod(sb_rules)
    can_access_resource = staticmethod(sb_can_access)


@pytest.mark.django_db
def test_pg_owner_can_delete_room(user, pg_tenant):
    from apps.tenancy.models import TenantMembership

    TenantMembership.objects.create(
        user=user, tenant=pg_tenant, role=TenantMembership.ROLE_OWNER, is_active=True
    )
    factory = APIRequestFactory()
    request = factory.delete("/api/meta/resources/pg-rooms/1/")
    request.user = user
    request.tenant = pg_tenant
    view = APIView()
    view.resource_slug = "pg-rooms"
    view.action = "destroy"
    perm = _PgPermission()
    assert perm.has_permission(request, view) is True


@pytest.mark.django_db
def test_pg_resident_cannot_delete_room(pg_resident_client, pg_tenant, pg_resident_user):
    factory = APIRequestFactory()
    request = factory.delete("/api/meta/resources/pg-rooms/1/")
    request.user = pg_resident_user
    request.tenant = pg_tenant
    view = APIView()
    view.resource_slug = "pg-rooms"
    view.action = "destroy"
    perm = _PgPermission()
    assert perm.has_permission(request, view) is False


@pytest.fixture
def sb_parent_request(db):
    from django.contrib.auth import get_user_model

    from apps.products.school_bus.models import Parent
    from apps.tenancy.models import Tenant, TenantMembership

    tenant = Tenant.objects.create(name="SB", slug="sb-rbac-test", is_active=True)
    user = get_user_model().objects.create_user(username="sbparent", password="x")
    Parent.objects.create(tenant=tenant, full_name="Parent", user=user, phone="+911111111111")
    TenantMembership.objects.create(
        user=user, tenant=tenant, role=TenantMembership.ROLE_PARENT, is_active=True
    )
    return user, tenant


@pytest.mark.django_db
def test_sb_parent_can_list_students(sb_parent_request):
    user, tenant = sb_parent_request
    factory = APIRequestFactory()
    request = factory.get("/api/meta/resources/sb-students/")
    request.user = user
    request.tenant = tenant
    view = APIView()
    view.resource_slug = "sb-students"
    view.action = "list"
    perm = _SbPermission()
    assert perm.has_permission(request, view) is True


@pytest.mark.django_db
def test_sb_parent_cannot_create_student(sb_parent_request):
    user, tenant = sb_parent_request
    factory = APIRequestFactory()
    request = factory.post("/api/meta/resources/sb-students/")
    request.user = user
    request.tenant = tenant
    view = APIView()
    view.resource_slug = "sb-students"
    view.action = "create"
    perm = _SbPermission()
    assert perm.has_permission(request, view) is False


def test_standard_actions_frozen():
    assert "list" in STANDARD_ACTIONS
    assert "timeline" not in STANDARD_ACTIONS


def test_pg_rules_staff_cannot_delete_rooms():
    rules = pg_rules("pg-rooms", "staff")
    assert rules is not None
    assert rules.get("delete") is False


def test_timeline_action_not_in_standard_actions():
    assert "timeline" not in STANDARD_ACTIONS
    assert "GET" in ("GET",)  # sanity
    assert SAFE_METHODS  # imported for doc tests
