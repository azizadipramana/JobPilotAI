from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Job, JobMatch

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

class JobResponse(BaseModel):
    id: int
    source: str
    source_id: str
    title: str
    company: Optional[str]
    location: Optional[str]
    country: Optional[str]
    employment_type: Optional[str]
    description: Optional[str]
    salary_min: Optional[int]
    salary_max: Optional[int]
    salary_currency: Optional[str]
    application_url: Optional[str]
    application_email: Optional[str]
    posted_at: Optional[datetime]
    is_active: bool
    created_at: datetime
    match_score: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)


class JobMatchResponse(BaseModel):
    id: int
    score: float
    skill_score: Optional[float]
    experience_score: Optional[float]
    education_score: Optional[float]
    location_score: Optional[float]
    explanation: Optional[str]
    missing_requirements: Optional[list]
    matched_skills: Optional[list]
    llm_analysis: Optional[str]
    model_config = ConfigDict(from_attributes=True)


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/jobs", response_model=list[JobResponse])
def list_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    country: Optional[str] = None,
    employment_type: Optional[str] = None,
    keyword: Optional[str] = None,
    profile_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Job).filter(Job.is_active == True)
    if country:
        q = q.filter(Job.country.ilike(f"%{country}%"))
    if employment_type:
        q = q.filter(Job.employment_type.ilike(f"%{employment_type}%"))
    if keyword:
        q = q.filter(
            Job.title.ilike(f"%{keyword}%") | Job.description.ilike(f"%{keyword}%")
        )
    jobs = q.order_by(Job.posted_at.desc()).offset(skip).limit(limit).all()

    results = []
    for job in jobs:
        jr = JobResponse.model_validate(job)
        if profile_id:
            match = (
                db.query(JobMatch)
                .filter_by(profile_id=profile_id, job_id=job.id)
                .first()
            )
            if match:
                jr.match_score = match.score
        results.append(jr)
    return results


@router.get("/jobs/{job_id}", response_model=JobResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job or not job.is_active:
        raise HTTPException(404, "Job not found")
    return job


@router.get("/jobs/{job_id}/match", response_model=JobMatchResponse)
def get_job_match(job_id: int, profile_id: int, db: Session = Depends(get_db)):
    match = db.query(JobMatch).filter_by(profile_id=profile_id, job_id=job_id).first()
    if not match:
        raise HTTPException(404, "No match record found")
    return match


@router.post("/jobs/{job_id}/drafts", status_code=201)
async def create_draft_for_job(
    job_id: int,
    payload: dict,
    db: Session = Depends(get_db),
):
    """Trigger CV + email draft generation for a job."""
    from app.agents.cv_agent import CVTailoringAgent
    from app.agents.email_agent import EmailApplicationAgent

    profile_id = payload.get("profile_id")
    if not profile_id:
        raise HTTPException(422, "profile_id required")

    cv_agent = CVTailoringAgent()
    draft = await cv_agent.generate_draft(profile_id=profile_id, job_id=job_id, db=db)

    email_agent = EmailApplicationAgent()
    draft = await email_agent.draft_email(draft=draft, db=db)

    db.commit()
    db.refresh(draft)
    return {"draft_id": draft.id, "status": draft.status}
