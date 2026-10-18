from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CandidateProfile

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

class ProfileCreate(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    professional_summary: Optional[str] = None
    skills: Optional[list] = []
    education: Optional[list] = []
    experience: Optional[list] = []
    projects: Optional[list] = []
    certifications: Optional[list] = []
    preferred_locations: Optional[list] = []
    preferred_countries: Optional[list] = []
    preferred_employment_types: Optional[list] = []
    preferred_keywords: Optional[list] = []
    min_salary: Optional[int] = None
    max_salary: Optional[int] = None


class ProfileUpdate(ProfileCreate):
    full_name: Optional[str] = None
    email: Optional[str] = None


class ProfileResponse(ProfileCreate):
    id: int
    is_active: bool
    model_config = ConfigDict(from_attributes=True)


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/profiles", response_model=ProfileResponse, status_code=201)
def create_profile(data: ProfileCreate, db: Session = Depends(get_db)):
    existing = db.query(CandidateProfile).filter_by(email=data.email).first()
    if existing:
        raise HTTPException(409, "A profile with this email already exists.")
    profile = CandidateProfile(**data.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/profiles", response_model=list[ProfileResponse])
def list_profiles(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return db.query(CandidateProfile).filter_by(is_active=True).offset(skip).limit(limit).all()


@router.get("/profiles/{profile_id}", response_model=ProfileResponse)
def get_profile(profile_id: int, db: Session = Depends(get_db)):
    p = db.get(CandidateProfile, profile_id)
    if not p or not p.is_active:
        raise HTTPException(404, "Profile not found")
    return p


@router.patch("/profiles/{profile_id}", response_model=ProfileResponse)
def update_profile(profile_id: int, data: ProfileUpdate, db: Session = Depends(get_db)):
    p = db.get(CandidateProfile, profile_id)
    if not p or not p.is_active:
        raise HTTPException(404, "Profile not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(p, field, value)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/profiles/{profile_id}", status_code=204)
def delete_profile(profile_id: int, db: Session = Depends(get_db)):
    p = db.get(CandidateProfile, profile_id)
    if not p:
        raise HTTPException(404, "Profile not found")
    p.is_active = False
    db.commit()
