from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from app.agents.job_sources.schema import NormalizedJob


class JobSource(ABC):
    """Pluggable interface for all job sources."""

    name: str = "base"

    @abstractmethod
    async def search(
        self,
        keywords: list[str],
        country: str = "id",
        location: Optional[str] = None,
        employment_type: Optional[str] = None,
        max_results: int = 20,
    ) -> list[NormalizedJob]:
        """Return a list of normalized jobs matching the query."""

    def is_available(self) -> bool:
        """Return False if required credentials are missing."""
        return True
