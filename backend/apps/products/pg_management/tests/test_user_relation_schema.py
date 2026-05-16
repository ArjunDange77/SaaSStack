import pytest


@pytest.mark.django_db
def test_resident_schema_user_fk_points_to_kernel_users(pg_member):
    response = pg_member.get("/api/meta/schema/pg-residents/")
    assert response.status_code == 200
    created = next(f for f in response.data["fields"] if f["name"] == "created_by")
    assert created["type"] == "relation"
    assert created["related_resource"] == "kernel-users"
    assert created["relation_display_field"] == "username"


@pytest.mark.django_db
def test_complaint_resolved_by_kernel_users(pg_member):
    response = pg_member.get("/api/meta/schema/pg-complaints/")
    assert response.status_code == 200
    resolved = next(f for f in response.data["fields"] if f["name"] == "resolved_by")
    assert resolved["related_resource"] == "kernel-users"
    assert resolved["relation_display_field"] == "username"
