from __future__ import annotations

import logging
from typing import Optional

from sqlalchemy.orm import Session

from app.agents.job_sources.adzuna import AdzunaAdapter
from app.agents.job_sources.base import JobSource
from app.agents.job_sources.mock_source import MockJobSource
from app.agents.job_sources.schema import NormalizedJob
from app.models import Job

logger = logging.getLogger(__name__)


class JobDiscoveryAgent:
    """
    Agent 1 — discovers jobs, normalizes, deduplicates, and persists them.
    """

    def __init__(self, source_preference: str = "auto"):
        self.source_preference = source_preference
        self._sources = self._build_sources(source_preference)

    def _build_sources(self, pref: str) -> list[JobSource]:
        adzuna = AdzunaAdapter()
        mock = MockJobSource()

        if pref == "adzuna":
            return [adzuna] if adzuna.is_available() else [mock]
        if pref == "mock":
            return [mock]
        # auto: prefer Adzuna if configured, else mock
        return [adzuna] if adzuna.is_available() else [mock]

    # ── Tools ──────────────────────────────────────────────────────────────────

    async def search_jobs(
        self,
        keywords: list[str],
        countries: list[str],
        employment_types: list[str],
        max_jobs: int,
    ) -> list[NormalizedJob]:
        all_jobs: list[NormalizedJob] = []
        per_country = max(1, max_jobs // max(len(countries), 1))

        for source in self._sources:
            for country in countries:
                emp_types = employment_types or [None]
                for emp_type in emp_types:
                    try:
                        jobs = await source.search(
                            keywords=keywords,
                            country=country,
                            employment_type=emp_type,
                            max_results=per_country,
                        )
                        all_jobs.extend(jobs)
                    except Exception as e:
                        logger.error("Source %s failed for country=%s: %s", source.name, country, e)

        return all_jobs[:max_jobs]

    def deduplicate_jobs(self, jobs: list[NormalizedJob], db: Session) -> list[NormalizedJob]:
        """Remove jobs already in DB (by source+source_id) and within the batch."""
        seen: set[tuple[str, str]] = set()
        unique = []
        for job in jobs:
            key = (job.source, job.source_id)
            if key in seen:
                continue
            seen.add(key)
            existing = (
                db.query(Job)
                .filter_by(source=job.source, source_id=job.source_id)
                .first()
            )
            if not existing:
                unique.append(job)
        return unique

    def save_job(self, nj: NormalizedJob, db: Session) -> Job:
        job = Job(
            source=nj.source,
            source_id=nj.source_id,
            title=nj.title,
            company=nj.company,
            location=nj.location,
            country=nj.country,
            employment_type=nj.employment_type,
            description=nj.description,
            requirements=nj.requirements,
            salary_min=nj.salary_min,
            salary_max=nj.salary_max,
            salary_currency=nj.salary_currency,
            application_url=nj.application_url,
            application_email=nj.application_email,
            posted_at=nj.posted_at,
            expires_at=nj.expires_at,
            raw_data=nj.raw_data,
        )
        db.add(job)
        return job

    async def run(
        self,
        keywords: list[str],
        countries: list[str],
        employment_types: list[str],
        max_jobs: int,
        db: Session,
    ) -> list[Job]:
        logger.info("Discovery: searching with keywords=%s countries=%s", keywords, countries)
        raw = await self.search_jobs(keywords, countries, employment_types, max_jobs)
        logger.info("Discovery: found %d raw jobs", len(raw))

        unique = self.deduplicate_jobs(raw, db)
        logger.info("Discovery: %d new unique jobs after dedup", len(unique))

        saved: list[Job] = []
        for nj in unique:
            job = self.save_job(nj, db)
            saved.append(job)

        db.flush()
        db.commit()
        logger.info("Discovery: saved %d jobs", len(saved))
        return saved
