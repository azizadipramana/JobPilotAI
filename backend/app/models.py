from __future__ import annotations

import hashlib
import json
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ─── Candidate Profile ────────────────────────────────────────────────────────

class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    location: Mapped[Optional[str]] = mapped_column(String(255))
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(500))
    github_url: Mapped[Optional[str]] = mapped_column(String(500))
    portfolio_url: Mapped[Optional[str]] = mapped_column(String(500))
    professional_summary: Mapped[Optional[str]] = mapped_column(Text)

    # Structured JSON fields
    skills: Mapped[Optional[dict]] = mapped_column(JSON, default=list)
    education: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    experience: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    projects: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    certifications: Mapped[Optional[list]] = mapped_column(JSON, default=list)

    # Preferences
    preferred_locations: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    preferred_countries: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    preferred_employment_types: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    preferred_keywords: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    min_salary: Mapped[Optional[int]] = mapped_column(Integer)
    max_salary: Mapped[Optional[int]] = mapped_column(Integer)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    job_matches: Mapped[list["JobMatch"]] = relationship(back_populates="profile")
    applications: Mapped[list["Application"]] = relationship(back_populates="profile")


# ─── Job ──────────────────────────────────────────────────────────────────────

class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    source: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    source_id: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    company: Mapped[Optional[str]] = mapped_column(String(500))
    location: Mapped[Optional[str]] = mapped_column(String(255))
    country: Mapped[Optional[str]] = mapped_column(String(100))
    employment_type: Mapped[Optional[str]] = mapped_column(String(100))
    description: Mapped[Optional[str]] = mapped_column(Text)
    requirements: Mapped[Optional[str]] = mapped_column(Text)
    salary_min: Mapped[Optional[int]] = mapped_column(Integer)
    salary_max: Mapped[Optional[int]] = mapped_column(Integer)
    salary_currency: Mapped[Optional[str]] = mapped_column(String(10))
    application_url: Mapped[Optional[str]] = mapped_column(String(2000))
    application_email: Mapped[Optional[str]] = mapped_column(String(255))
    posted_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    raw_data: Mapped[Optional[dict]] = mapped_column(JSON)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("source", "source_id", name="uq_job_source_sourceid"),
        Index("ix_jobs_country", "country"),
        Index("ix_jobs_employment_type", "employment_type"),
        Index("ix_jobs_posted_at", "posted_at"),
    )

    # Relationships
    job_matches: Mapped[list["JobMatch"]] = relationship(back_populates="job")
    application_drafts: Mapped[list["ApplicationDraft"]] = relationship(back_populates="job")


# ─── Job Match ────────────────────────────────────────────────────────────────

class JobMatch(Base):
    __tablename__ = "job_matches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("candidate_profiles.id"), nullable=False)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    skill_score: Mapped[Optional[float]] = mapped_column(Float)
    experience_score: Mapped[Optional[float]] = mapped_column(Float)
    education_score: Mapped[Optional[float]] = mapped_column(Float)
    location_score: Mapped[Optional[float]] = mapped_column(Float)
    keyword_score: Mapped[Optional[float]] = mapped_column(Float)
    explanation: Mapped[Optional[str]] = mapped_column(Text)
    missing_requirements: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    matched_skills: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    llm_analysis: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("profile_id", "job_id", name="uq_jobmatch_profile_job"),
        Index("ix_job_matches_score", "score"),
    )

    profile: Mapped["CandidateProfile"] = relationship(back_populates="job_matches")
    job: Mapped["Job"] = relationship(back_populates="job_matches")


# ─── Workflow Run ─────────────────────────────────────────────────────────────

class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    profile_id: Mapped[Optional[int]] = mapped_column(ForeignKey("candidate_profiles.id"))
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="pending", index=True
    )  # pending | running | completed | failed
    stage: Mapped[Optional[str]] = mapped_column(String(100))
    search_params: Mapped[Optional[dict]] = mapped_column(JSON)
    jobs_discovered: Mapped[int] = mapped_column(Integer, default=0)
    jobs_matched: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    started_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    profile: Mapped[Optional["CandidateProfile"]] = relationship()


# ─── Application Draft ────────────────────────────────────────────────────────

class ApplicationDraft(Base):
    __tablename__ = "application_drafts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("candidate_profiles.id"), nullable=False)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    recipient_email: Mapped[Optional[str]] = mapped_column(String(255))
    recipient_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    subject: Mapped[Optional[str]] = mapped_column(String(500))
    body: Mapped[Optional[str]] = mapped_column(Text)
    cv_file_path: Mapped[Optional[str]] = mapped_column(String(1000))
    cv_file_hash: Mapped[Optional[str]] = mapped_column(String(64))

    # Content hash for approval binding
    content_hash: Mapped[Optional[str]] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="draft"
    )  # draft | awaiting_approval | approved | rejected | sent | failed
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    profile: Mapped["CandidateProfile"] = relationship()
    job: Mapped["Job"] = relationship(back_populates="application_drafts")
    approval_records: Mapped[list["ApprovalRecord"]] = relationship(back_populates="draft")
    application: Mapped[Optional["Application"]] = relationship(back_populates="draft")

    def compute_content_hash(self) -> str:
        """Bind approval to exact content — recompute whenever body/subject/cv changes."""
        payload = {
            "subject": self.subject or "",
            "body": self.body or "",
            "recipient_email": self.recipient_email or "",
            "cv_file_hash": self.cv_file_hash or "",
        }
        return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()

    def refresh_content_hash(self) -> None:
        self.content_hash = self.compute_content_hash()


# ─── Approval Record ──────────────────────────────────────────────────────────

class ApprovalRecord(Base):
    __tablename__ = "approval_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    draft_id: Mapped[int] = mapped_column(ForeignKey("application_drafts.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)  # approved | rejected
    approved_content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (Index("ix_approval_records_draft_id", "draft_id"),)

    draft: Mapped["ApplicationDraft"] = relationship(back_populates="approval_records")


# ─── Application ──────────────────────────────────────────────────────────────

class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("candidate_profiles.id"), nullable=False)
    draft_id: Mapped[int] = mapped_column(ForeignKey("application_drafts.id"), nullable=False, unique=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), nullable=False)
    sent_content_hash: Mapped[Optional[str]] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="approved", index=True
    )  # approved | sending | sent | failed | uncertain
    provider_message_id: Mapped[Optional[str]] = mapped_column(String(500))
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    profile: Mapped["CandidateProfile"] = relationship(back_populates="applications")
    draft: Mapped["ApplicationDraft"] = relationship(back_populates="application")
    job: Mapped["Job"] = relationship()
