from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class NormalizedJob:
    """Canonical job representation regardless of source."""
    source: str
    source_id: str
    title: str
    company: Optional[str] = None
    location: Optional[str] = None
    country: Optional[str] = None
    employment_type: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: Optional[str] = None
    application_url: Optional[str] = None
    application_email: Optional[str] = None
    posted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    raw_data: dict = field(default_factory=dict)
