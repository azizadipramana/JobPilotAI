from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

import httpx

from app.agents.job_sources.base import JobSource
from app.agents.job_sources.schema import NormalizedJob
from app.config import get_settings

logger = logging.getLogger(__name__)

ADZUNA_API_BASE = "https://api.adzuna.com/v1/api/jobs"

_EMPLOYMENT_MAP = {
    "permanent": "full_time",
    "contract": "contract",
    "part_time": "part_time",
    "temporary": "contract",
}


class AdzunaAdapter(JobSource):
    """
    Adzuna job search API adapter.

    Requires ADZUNA_APP_ID and ADZUNA_APP_KEY environment variables.
    Falls back to None / empty list if not configured.
    """

    name = "adzuna"

    def __init__(self):
        settings = get_settings()
        self.app_id = settings.adzuna_app_id
        self.app_key = settings.adzuna_app_key
        self.default_country = settings.adzuna_country

    def is_available(self) -> bool:
        return bool(self.app_id and self.app_key)

    async def search(
        self,
        keywords: list[str],
        country: str = "id",
        location: Optional[str] = None,
        employment_type: Optional[str] = None,
        max_results: int = 20,
    ) -> list[NormalizedJob]:
        if not self.is_available():
            logger.warning("Adzuna credentials not configured — returning empty list")
            return []

        results = []
        page = 1
        per_page = min(max_results, 50)
        query = " ".join(keywords) if keywords else "software engineer"
        country_code = (country or self.default_country).lower()

        async with httpx.AsyncClient(timeout=30) as client:
            while len(results) < max_results:
                params = {
                    "app_id": self.app_id,
                    "app_key": self.app_key,
                    "results_per_page": per_page,
                    "page": page,
                    "what": query,
                }
                if location:
                    params["where"] = location

                try:
                    url = f"{ADZUNA_API_BASE}/{country_code}/search/{page}"
                    resp = await client.get(url, params=params)
                    resp.raise_for_status()
                    data = resp.json()
                except httpx.HTTPStatusError as e:
                    logger.error("Adzuna HTTP error %s: %s", e.response.status_code, e.response.text)
                    break
                except Exception as e:
                    logger.error("Adzuna request error: %s", e)
                    break

                raw_jobs = data.get("results", [])
                if not raw_jobs:
                    break

                for rj in raw_jobs:
                    nj = self._normalize(rj, country_code)
                    if nj:
                        results.append(nj)

                if len(raw_jobs) < per_page:
                    break
                page += 1

        return results[:max_results]

    def _normalize(self, raw: dict, country: str) -> Optional[NormalizedJob]:
        try:
            source_id = str(raw.get("id", ""))
            if not source_id:
                return None

            salary_min = raw.get("salary_min")
            salary_max = raw.get("salary_max")
            emp_type_raw = raw.get("contract_type", "")
            emp_type = _EMPLOYMENT_MAP.get(emp_type_raw, emp_type_raw or None)

            posted_raw = raw.get("created")
            posted_at = None
            if posted_raw:
                try:
                    posted_at = datetime.fromisoformat(posted_raw.rstrip("Z"))
                except ValueError:
                    pass

            return NormalizedJob(
                source="adzuna",
                source_id=source_id,
                title=raw.get("title", "Untitled"),
                company=raw.get("company", {}).get("display_name"),
                location=raw.get("location", {}).get("display_name"),
                country=country.upper(),
                employment_type=emp_type,
                description=raw.get("description"),
                salary_min=int(salary_min) if salary_min else None,
                salary_max=int(salary_max) if salary_max else None,
                salary_currency="GBP",  # Adzuna typically returns GBP
                application_url=raw.get("redirect_url"),
                posted_at=posted_at,
                raw_data=raw,
            )
        except Exception as e:
            logger.warning("Failed to normalize Adzuna job: %s", e)
            return None
