import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.products.pg_management.models import Document, Resident, Room


@pytest.mark.django_db
def test_alive_excludes_soft_deleted_pg_models(pg_tenant, user):
    room = Room.objects.create(
        tenant=pg_tenant,
        room_number="DEL1",
        floor="1",
        created_by=user,
        updated_by=user,
    )
    room.deleted_at = room.updated_at
    room.is_active = False
    room.save(update_fields=["deleted_at", "is_active"])

    assert Room.objects.filter(tenant=pg_tenant, room_number="DEL1").exists()
    assert not Room.objects.alive().filter(tenant=pg_tenant, room_number="DEL1").exists()

    resident = Resident.objects.create(
        tenant=pg_tenant,
        full_name="Doc Resident",
        phone="1111111111",
        created_by=user,
        updated_by=user,
    )
    doc = Document.objects.create(
        tenant=pg_tenant,
        resident=resident,
        document_type="id_proof",
        uploaded_file=SimpleUploadedFile("x.pdf", b"data", content_type="application/pdf"),
        created_by=user,
        updated_by=user,
    )
    doc.deleted_at = doc.updated_at
    doc.is_active = False
    doc.save(update_fields=["deleted_at", "is_active"])

    assert Document.objects.filter(pk=doc.pk).exists()
    assert not Document.objects.alive().filter(pk=doc.pk).exists()
