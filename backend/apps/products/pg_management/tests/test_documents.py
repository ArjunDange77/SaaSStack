from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.products.pg_management.models import Document, Resident


@pytest.mark.django_db
def test_document_upload_and_verify(pg_member, pg_tenant):
    client = pg_member
    resident = Resident.objects.create(
        tenant=pg_tenant, full_name="Doc User", phone="8888888888"
    )
    upload = SimpleUploadedFile("id.pdf", b"fake pdf content", content_type="application/pdf")
    create = client.post(
        "/api/meta/resources/pg-documents/",
        {
            "resident": resident.pk,
            "document_type": "id_proof",
            "uploaded_file": upload,
        },
        format="multipart",
    )
    assert create.status_code == 201
    pk = create.data["id"]

    verify = client.post(f"/api/meta/resources/pg-documents/{pk}/verify/")
    assert verify.status_code == 200
    assert verify.data["verification_status"] == "verified"

    reject = client.post(
        f"/api/meta/resources/pg-documents/{pk}/reject/",
        {"remarks": "blurry"},
        format="json",
    )
    assert reject.status_code == 200
    assert reject.data["verification_status"] == "rejected"
