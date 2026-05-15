import pytest

from apps.registry.metadata import build_resource_metadata
from apps.products.pg_management.views import BedAssignmentViewSet, DocumentViewSet


@pytest.mark.django_db
def test_bed_assignment_schema_has_relation_fields():
    meta = build_resource_metadata("pg-bed-assignments", BedAssignmentViewSet, title="Assignments")
    resident = next(f for f in meta["fields"] if f["name"] == "resident")
    room = next(f for f in meta["fields"] if f["name"] == "room")
    assert resident["type"] == "relation"
    assert resident["related_resource"] == "pg-residents"
    assert resident["relation_display_field"] == "full_name"
    assert room["related_resource"] == "pg-rooms"
    assert room["relation_display_field"] == "room_number"


@pytest.mark.django_db
def test_document_schema_has_file_field():
    meta = build_resource_metadata("pg-documents", DocumentViewSet, title="Documents")
    upload = next(f for f in meta["fields"] if f["name"] == "uploaded_file")
    assert upload["type"] == "file"
