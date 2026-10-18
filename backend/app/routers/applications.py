from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Application, ApplicationDraft

router = APIRouter()


class ApplicationResponse(BaseModel):
    id: int
    profile_id: int
    draft_id: int
    job_id: int
    status: str
    provider_message_id: Optional[str]
    error_message: Optional[str]
    approved_at: Optional[datetime]
    sent_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


@router.get("/applications", response_model=list[ApplicationResponse])
def list_applications(
    profile_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(Application)
    if profile_id:
        q = q.filter_by(profile_id=profile_id)
    if status:
        q = q.filter_by(status=status)
    return q.order_by(Application.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/applications/{app_id}", response_model=ApplicationResponse)
def get_application(app_id: int, db: Session = Depends(get_db)):
    app = db.get(Application, app_id)
    if not app:
        raise HTTPException(404, "Application not found")
    return app


@router.post("/applications/{app_id}/send", status_code=200)
async def send_application(app_id: int, db: Session = Depends(get_db)):
    """
    Verify approval and attempt to send. Email sending is disabled until
    Gmail OAuth credentials are configured.
    """
    from datetime import datetime as dt
    from app.config import get_settings

    application = db.get(Application, app_id)
    if not application:
        raise HTTPException(404, "Application not found")

    if application.status == "sent":
        raise HTTPException(409, "Already sent")

    draft = db.get(ApplicationDraft, application.draft_id)
    if not draft:
        raise HTTPException(404, "Draft missing")

    # Re-verify approval and content integrity
    if draft.status != "approved":
        raise HTTPException(403, "Draft must be approved before sending")

    current_hash = draft.compute_content_hash()
    if application.sent_content_hash and application.sent_content_hash != current_hash:
        raise HTTPException(409, "Draft content changed after approval — re-approve required")

    settings = get_settings()
    if not settings.email_send_enabled:
        return {
            "ok": False,
            "message": "Email sending is disabled in development mode. "
                       "Configure Gmail OAuth credentials and set APP_ENV=production to enable.",
            "draft_id": draft.id,
            "status": "approved",
            "mock": True,
        }

    # Gmail send path (Phase 6)
    from app.integrations.gmail import GmailService
    service = GmailService()
    try:
        application.status = "sending"
        db.commit()
        msg_id = await service.send(draft=draft)
        application.status = "sent"
        application.sent_at = dt.utcnow()
        application.provider_message_id = msg_id
        application.sent_content_hash = current_hash
        draft.status = "sent"
        db.commit()
        return {"ok": True, "status": "sent", "message_id": msg_id}
    except Exception as e:
        application.status = "uncertain"
        application.error_message = str(e)
        db.commit()
        raise HTTPException(500, f"Send failed (status=uncertain): {e}")
