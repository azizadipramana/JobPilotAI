from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_create_profile(client):
    payload = {
        "full_name": "Budi Santoso",
        "email": "budi@test.com",
        "skills": ["Python", "FastAPI", "React"],
        "preferred_countries": ["id"],
        "preferred_employment_types": ["full_time", "internship"],
    }
    resp = await client.post("/api/v1/profiles", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["full_name"] == "Budi Santoso"
    assert data["id"] > 0
    return data["id"]


@pytest.mark.asyncio
async def test_duplicate_profile_email(client):
    payload = {"full_name": "Duplicate", "email": "dup@test.com"}
    await client.post("/api/v1/profiles", json=payload)
    resp = await client.post("/api/v1/profiles", json=payload)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_get_profile(client):
    payload = {"full_name": "Siti", "email": "siti@test.com"}
    create = await client.post("/api/v1/profiles", json=payload)
    pid = create.json()["id"]
    resp = await client.get(f"/api/v1/profiles/{pid}")
    assert resp.status_code == 200
    assert resp.json()["email"] == "siti@test.com"


@pytest.mark.asyncio
async def test_update_profile(client):
    payload = {"full_name": "Agus", "email": "agus@test.com"}
    create = await client.post("/api/v1/profiles", json=payload)
    pid = create.json()["id"]
    resp = await client.patch(f"/api/v1/profiles/{pid}", json={"professional_summary": "An engineer"})
    assert resp.status_code == 200
    assert resp.json()["professional_summary"] == "An engineer"


@pytest.mark.asyncio
async def test_list_profiles(client):
    resp = await client.get("/api/v1/profiles")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
