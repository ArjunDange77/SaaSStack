import pytest
from django.test import override_settings
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_health_ok():
    client = APIClient()
    response = client.get("/api/health/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["checks"]["database"] == "ok"
    assert "version" in data
    assert "environment" in data


@pytest.mark.django_db
@override_settings(APP_VERSION="test-sha", DEPLOY_ENV="staging")
def test_health_version_and_environment():
    client = APIClient()
    data = client.get("/api/health/").json()
    assert data["version"] == "test-sha"
    assert data["environment"] == "staging"
