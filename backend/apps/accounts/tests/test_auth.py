import pytest


@pytest.mark.django_db
def test_login_returns_access_and_refresh(api_client, user):
    response = api_client.post(
        "/api/auth/login/",
        {"username": "testuser", "password": "testpass123"},
        format="json",
    )
    assert response.status_code == 200
    assert response.data.get("access")
    assert response.data.get("refresh")


@pytest.mark.django_db
def test_login_invalid_credentials(api_client, user):
    response = api_client.post(
        "/api/auth/login/",
        {"username": "testuser", "password": "wrong"},
        format="json",
    )
    assert response.status_code == 401


@pytest.mark.django_db
def test_refresh_returns_new_access(api_client, user):
    login = api_client.post(
        "/api/auth/login/",
        {"username": "testuser", "password": "testpass123"},
        format="json",
    )
    refresh = login.data["refresh"]
    response = api_client.post("/api/auth/refresh/", {"refresh": refresh}, format="json")
    assert response.status_code == 200
    assert response.data.get("access")


@pytest.mark.django_db
def test_me_requires_auth(api_client):
    response = api_client.get("/api/accounts/me/")
    assert response.status_code == 401


@pytest.mark.django_db
def test_me_returns_user_without_tenant(pg_member):
    response = pg_member.get("/api/accounts/me/")
    assert response.status_code == 200
    assert response.data["username"] == "testuser"
    assert response.data["role"] == "owner"


@pytest.mark.django_db
def test_me_includes_resident_id_for_resident(pg_resident_client):
    response = pg_resident_client.get("/api/accounts/me/")
    assert response.status_code == 200
    assert response.data["role"] == "resident"
    assert response.data["resident_id"] == pg_resident_client.resident.id
