from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import WorkflowRun

router = APIRouter()


class WorkflowCreate(BaseModel):
    profile_id: int
    keywords: Optional[list[str]] = []
    countries: Optional[list[str]] = ["id"]
    employment_types: Optional[list[str]] = []
    max_jobs: Optional[int] = 50
    run_matching: Optional[bool] = True
    job_source: Optional[str] = "auto"  # auto | mock | adzuna


class WorkflowResponse(BaseModel):
    id: int
    profile_id: Optional[int]
    status: str
    stage: Optional[str]
    jobs_discovered: int
    jobs_matched: int
    error_message: Optional[str]
    started_at: datetime
    completed_at: Optional[datetime]
    model_config = ConfigDict(from_attributes=True)


@router.post("/workflows", response_model=WorkflowResponse, status_code=201)
async def start_workflow(
    data: WorkflowCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    run = WorkflowRun(
        profile_id=data.profile_id,
        status="running",
        stage="discovery",
        search_params=data.model_dump(),
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    background_tasks.add_task(_run_workflow, run.id, data.model_dump())
    return run


@router.get("/workflows/{workflow_id}", response_model=WorkflowResponse)
def get_workflow(workflow_id: int, db: Session = Depends(get_db)):
    run = db.get(WorkflowRun, workflow_id)
    if not run:
        raise HTTPException(404, "Workflow not found")
    return run


@router.get("/workflows", response_model=list[WorkflowResponse])
def list_workflows(
    profile_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    q = db.query(WorkflowRun)
    if profile_id:
        q = q.filter_by(profile_id=profile_id)
    return q.order_by(WorkflowRun.started_at.desc()).offset(skip).limit(limit).all()


async def _run_workflow(run_id: int, params: dict):
    """Background orchestrator — runs discovery then matching."""
    from datetime import datetime as dt

    from app.agents.discovery_agent import JobDiscoveryAgent
    from app.agents.matching_agent import JobMatchingAgent
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        run = db.get(WorkflowRun, run_id)
        if not run:
            return

        # ── Stage 1: Discovery ───────────────────────────────────────
        run.stage = "discovery"
        db.commit()

        source_pref = params.get("job_source", "auto")
        agent = JobDiscoveryAgent(source_preference=source_pref)
        jobs = await agent.run(
            keywords=params.get("keywords", []),
            countries=params.get("countries", ["id"]),
            employment_types=params.get("employment_types", []),
            max_jobs=params.get("max_jobs", 50),
            db=db,
        )
        run.jobs_discovered = len(jobs)
        db.commit()

        # ── Stage 2: Matching ────────────────────────────────────────
        if params.get("run_matching", True) and params.get("profile_id"):
            run.stage = "matching"
            db.commit()

            matcher = JobMatchingAgent()
            matched = await matcher.run(
                profile_id=params["profile_id"],
                job_ids=[j.id for j in jobs],
                db=db,
            )
            run.jobs_matched = len(matched)

        run.status = "completed"
        run.stage = "done"
        run.completed_at = dt.utcnow()
        db.commit()

    except Exception as e:
        import traceback
        if run := db.get(WorkflowRun, run_id):
            run.status = "failed"
            run.error_message = f"{e}\n{traceback.format_exc()}"
            run.completed_at = dt.utcnow()
            db.commit()
    finally:
        db.close()
