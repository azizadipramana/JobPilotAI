from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ApplicationDraft

router = APIRouter()


class DraftResponse(BaseModel):
    id: int
    profile_id: int
    job_id: int
    version: int
    recipient_email: Optional[str]
    recipient_verified: bool
    subject: Optional[str]
    body: Optional[str]
    cv_file_path: Optional[str]
    content_hash: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class DraftUpdate(BaseModel):
    subject: Optional[str] = None
    body: Optional[str] = None
    recipient_email: Optional[str] = None


class ApprovalRequest(BaseModel):
    content_hash: str  # Must match current draft hash — prevents stale approvals
    notes: Optional[str] = None


@router.get("/drafts", response_model=list[DraftResponse])
def list_drafts(
    profile_id: Optional[int] = None,
    job_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(ApplicationDraft)
    if profile_id:
        q = q.filter_by(profile_id=profile_id)
    if job_id:
        q = q.filter_by(job_id=job_id)
    if status:
        q = q.filter_by(status=status)
    return q.order_by(ApplicationDraft.updated_at.desc()).offset(skip).limit(limit).all()


@router.get("/drafts/{draft_id}", response_model=DraftResponse)
def get_draft(draft_id: int, db: Session = Depends(get_db)):
    draft = db.get(ApplicationDraft, draft_id)
    if not draft:
        raise HTTPException(404, "Draft not found")
    return draft


@router.patch("/drafts/{draft_id}", response_model=DraftResponse)
def update_draft(draft_id: int, data: DraftUpdate, db: Session = Depends(get_db)):
    draft = db.get(ApplicationDraft, draft_id)
    if not draft:
        raise HTTPException(404, "Draft not found")
    if draft.status in ("approved", "sent"):
        raise HTTPException(409, f"Cannot edit a draft in status '{draft.status}'")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(draft, field, value)

    # Bump version and recompute hash — invalidates any prior approval
    draft.version += 1
    draft.refresh_content_hash()
    draft.status = "draft"
    db.commit()
    db.refresh(draft)
    return draft


@router.post("/drafts/{draft_id}/approve", status_code=200)
def approve_draft(draft_id: int, req: ApprovalRequest, db: Session = Depends(get_db)):
    from app.models import Application, ApprovalRecord

    draft = db.get(ApplicationDraft, draft_id)
    if not draft:
        raise HTTPException(404, "Draft not found")

    # Security: hash must match exactly
    current_hash = draft.compute_content_hash()
    if req.content_hash != current_hash:
        raise HTTPException(
            409,
            "Content hash mismatch — the draft has changed since you loaded it. "
            "Please reload and re-review before approving.",
        )

    if draft.status == "sent":
        raise HTTPException(409, "This draft has already been sent.")

    record = ApprovalRecord(
        draft_id=draft.id,
        action="approved",
        approved_content_hash=current_hash,
        notes=req.notes,
    )
    db.add(record)
    draft.status = "approved"

    # Create or update application entry
    app_record = db.query(Application).filter_by(draft_id=draft.id).first()
    if not app_record:
        app_record = Application(
            profile_id=draft.profile_id,
            draft_id=draft.id,
            job_id=draft.job_id,
            sent_content_hash=current_hash,
            status="approved",
            approved_at=datetime.utcnow(),
        )
        db.add(app_record)
    else:
        app_record.status = "approved"
        app_record.sent_content_hash = current_hash
        app_record.approved_at = datetime.utcnow()

    db.commit()
    return {"ok": True, "draft_id": draft_id, "status": "approved", "application_id": app_record.id}


@router.post("/drafts/{draft_id}/reject", status_code=200)
def reject_draft(draft_id: int, req: ApprovalRequest, db: Session = Depends(get_db)):
    from app.models import Application, ApprovalRecord

    draft = db.get(ApplicationDraft, draft_id)
    if not draft:
        raise HTTPException(404, "Draft not found")

    record = ApprovalRecord(
        draft_id=draft.id,
        action="rejected",
        approved_content_hash=draft.content_hash or "",
        notes=req.notes,
    )
    db.add(record)
    draft.status = "rejected"

    app_record = db.query(Application).filter_by(draft_id=draft.id).first()
    if app_record:
        app_record.status = "rejected"

    db.commit()
    return {"ok": True, "draft_id": draft_id, "status": "rejected"}


@router.get("/drafts/{draft_id}/cv")
def download_cv(draft_id: int, db: Session = Depends(get_db)):
    draft = db.get(ApplicationDraft, draft_id)
    if not draft or not draft.cv_file_path:
        raise HTTPException(404, "CV file not found")
    import os
    if not os.path.exists(draft.cv_file_path):
        raise HTTPException(404, "CV file missing from disk")
    return FileResponse(
        draft.cv_file_path,
        media_type="application/pdf",
        filename=f"cv_draft_{draft_id}.pdf",
    )
