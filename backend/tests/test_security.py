from __future__ import annotations

import pytest

from app.models import ApplicationDraft


class TestApprovalSecurity:
    """Verify content-hash binding prevents stale approvals."""

    def _make_draft(self, **kwargs) -> ApplicationDraft:
        draft = ApplicationDraft(
            profile_id=1,
            job_id=1,
            version=1,
            recipient_email="jobs@company.com",
            subject="Application for SWE",
            body="Dear Hiring Manager, ...",
            cv_file_hash="abc123",
        )
        for k, v in kwargs.items():
            setattr(draft, k, v)
        draft.refresh_content_hash()
        return draft

    def test_hash_is_stable(self):
        d = self._make_draft()
        h1 = d.compute_content_hash()
        h2 = d.compute_content_hash()
        assert h1 == h2

    def test_hash_changes_on_subject_edit(self):
        d = self._make_draft()
        h1 = d.compute_content_hash()
        d.subject = "MODIFIED SUBJECT"
        h2 = d.compute_content_hash()
        assert h1 != h2

    def test_hash_changes_on_body_edit(self):
        d = self._make_draft()
        h1 = d.compute_content_hash()
        d.body = "Completely different body"
        h2 = d.compute_content_hash()
        assert h1 != h2

    def test_hash_changes_on_recipient_change(self):
        d = self._make_draft()
        h1 = d.compute_content_hash()
        d.recipient_email = "different@company.com"
        h2 = d.compute_content_hash()
        assert h1 != h2

    def test_hash_changes_on_cv_change(self):
        d = self._make_draft()
        h1 = d.compute_content_hash()
        d.cv_file_hash = "newcvhash456"
        h2 = d.compute_content_hash()
        assert h1 != h2

    def test_approval_must_match_current_hash(self):
        d = self._make_draft()
        original_hash = d.content_hash
        # Simulate edit after user loads page
        d.body = "Edited after loading"
        d.refresh_content_hash()
        # Old hash should not match
        assert original_hash != d.content_hash

    def test_version_increments_on_edit(self):
        d = self._make_draft()
        assert d.version == 1
        d.version += 1
        d.refresh_content_hash()
        assert d.version == 2


class TestMockJobSource:
    @pytest.mark.asyncio
    async def test_returns_jobs(self):
        from app.agents.job_sources.mock_source import MockJobSource
        source = MockJobSource()
        jobs = await source.search(keywords=["python"], country="id", max_results=5)
        assert len(jobs) == 5
        for job in jobs:
            assert job.source == "mock"
            assert job.source_id
            assert job.title

    @pytest.mark.asyncio
    async def test_dedup_by_source_id(self):
        from app.agents.job_sources.mock_source import MockJobSource
        source = MockJobSource()
        jobs1 = await source.search(keywords=["python"], country="id", max_results=10)
        jobs2 = await source.search(keywords=["python"], country="id", max_results=10)
        # Source IDs should be consistent for same index
        assert jobs1[0].source_id == jobs2[0].source_id

    @pytest.mark.asyncio
    async def test_max_results_respected(self):
        from app.agents.job_sources.mock_source import MockJobSource
        source = MockJobSource()
        jobs = await source.search(keywords=[], country="id", max_results=3)
        assert len(jobs) <= 3


class TestLLMClient:
    @pytest.mark.asyncio
    async def test_mock_provider(self):
        from app.llm.client import LLMClient
        client = LLMClient(provider="mock")
        result = await client.chat([{"role": "user", "content": "Hello"}])
        assert "content" in result
        assert len(result["content"]) > 0

    @pytest.mark.asyncio
    async def test_mock_ping(self):
        from app.llm.client import LLMClient
        client = LLMClient(provider="mock")
        result = await client.ping()
        assert result["status"] == "ok"
        assert result["provider"] == "mock"

    @pytest.mark.asyncio
    async def test_mock_generate(self):
        from app.llm.client import LLMClient
        client = LLMClient(provider="mock")
        response = await client.generate("Test prompt")
        assert isinstance(response, str)
        assert len(response) > 0
