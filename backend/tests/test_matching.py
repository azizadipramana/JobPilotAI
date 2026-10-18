from __future__ import annotations

import pytest

from app.agents.matching_agent import JobMatchingAgent
from app.models import CandidateProfile, Job


def make_profile(**kwargs) -> CandidateProfile:
    defaults = {
        "full_name": "Test User",
        "email": "test@example.com",
        "skills": ["Python", "FastAPI", "React"],
        "preferred_locations": ["Jakarta", "Remote"],
        "preferred_countries": ["id"],
        "preferred_employment_types": ["full_time"],
        "preferred_keywords": ["python", "backend"],
        "education": [{"degree": "Bachelor of Computer Science", "institution": "UI"}],
        "experience": [{"title": "SWE", "company": "Acme"}],
    }
    defaults.update(kwargs)
    return CandidateProfile(**defaults)


def make_job(**kwargs) -> Job:
    defaults = {
        "source": "mock",
        "source_id": "test-001",
        "title": "Python Backend Developer",
        "company": "TechCorp",
        "location": "Jakarta",
        "country": "ID",
        "employment_type": "full_time",
        "description": (
            "Looking for a Python developer with FastAPI experience. "
            "Skills: Python, FastAPI, REST API, SQL. "
            "Bachelor degree preferred."
        ),
    }
    defaults.update(kwargs)
    return Job(**defaults)


class TestMatchingAgent:
    agent = JobMatchingAgent()

    def test_perfect_match(self):
        profile = make_profile()
        job = make_job()
        result = self.agent.calculate_match_score(profile, job)
        assert result["score"] > 0.5
        assert "Python" in result["matched_skills"] or "python" in result["matched_skills"]

    def test_no_skills_match(self):
        profile = make_profile(skills=["Rust", "Haskell"])
        job = make_job()
        result = self.agent.calculate_match_score(profile, job)
        assert result["skill_score"] == 0.0
        assert result["matched_skills"] == []

    def test_location_match(self):
        profile = make_profile(preferred_locations=["Jakarta"])
        job = make_job(location="Jakarta")
        result = self.agent.calculate_match_score(profile, job)
        assert result["location_score"] == 1.0

    def test_location_mismatch(self):
        profile = make_profile(preferred_locations=["Surabaya"], preferred_countries=["sg"])
        job = make_job(location="Jakarta", country="id")
        result = self.agent.calculate_match_score(profile, job)
        assert result["location_score"] < 0.5

    def test_remote_location_always_good(self):
        profile = make_profile(preferred_locations=["Bandung"])
        job = make_job(location="Remote")
        result = self.agent.calculate_match_score(profile, job)
        assert result["location_score"] == 1.0

    def test_employment_type_match(self):
        profile = make_profile(preferred_employment_types=["internship"])
        job = make_job(employment_type="internship")
        result = self.agent.calculate_match_score(profile, job)
        assert result["employment_type_score"] == 1.0

    def test_missing_education_flagged(self):
        profile = make_profile(education=[])
        job = make_job(description="Bachelor degree required. Python skills needed.")
        result = self.agent.calculate_match_score(profile, job)
        assert any("degree" in r.lower() or "education" in r.lower() for r in result["missing_requirements"])

    def test_score_range(self):
        profile = make_profile()
        job = make_job()
        result = self.agent.calculate_match_score(profile, job)
        assert 0.0 <= result["score"] <= 1.0

    def test_score_reproducible(self):
        profile = make_profile()
        job = make_job()
        r1 = self.agent.calculate_match_score(profile, job)
        r2 = self.agent.calculate_match_score(profile, job)
        assert r1["score"] == r2["score"]
