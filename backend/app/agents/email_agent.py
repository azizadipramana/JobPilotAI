from __future__ import annotations

import logging
from typing import Optional

from sqlalchemy.orm import Session

from app.llm.client import get_llm_client
from app.models import Application, ApplicationDraft, CandidateProfile, Job

logger = logging.getLogger(__name__)


class EmailApplicationAgent:
    """
    Agent 4 — drafts professional application emails.
    Never fabricates recruiter emails. Requires explicit approval.
    """

    # ── Tools ──────────────────────────────────────────────────────────────────

    def get_application_address(self, job: Job) -> tuple[Optional[str], bool]:
        """
        Returns (email, is_verified).
        Only uses explicitly stored application_email.
        Does NOT guess addresses.
        """
        if job.application_email:
            return job.application_email, True
        return None, False

    async def draft_email(
        self, draft: ApplicationDraft, db: Session
    ) -> ApplicationDraft:
        job = db.get(Job, draft.job_id)
        profile = db.get(CandidateProfile, draft.profile_id)

        if not job or not profile:
            raise ValueError("Job or profile not found for draft")

        recipient, verified = self.get_application_address(job)
        draft.recipient_email = recipient
        draft.recipient_verified = verified

        subject, body = await self._generate_email(profile, job)
        draft.subject = subject
        draft.body = body
        draft.status = "draft"
        draft.refresh_content_hash()
        return draft

    async def _generate_email(
        self, profile: CandidateProfile, job: Job
    ) -> tuple[str, str]:
        client = get_llm_client()

        skills_str = ", ".join(
            s if isinstance(s, str) else s.get("name", str(s))
            for s in (profile.skills or [])[:8]
        )
        experience = profile.experience or []
        exp_summary = (
            f"{len(experience)} work experience(s) including "
            + ", ".join(
                f"{e.get('title', 'role')} at {e.get('company', 'company')}"
                for e in experience[:2]
            )
            if experience
            else "no prior work experience (student/fresh graduate)"
        )

        prompt = f"""Write a professional job application email.

Candidate: {profile.full_name}
Email: {profile.email}
Key Skills: {skills_str}
Experience: {exp_summary}
Summary: {profile.professional_summary or 'Not provided'}

Job: {job.title} at {job.company or 'the company'}
Location: {job.location or 'Unknown'}
Job Description: {(job.description or '')[:600]}

Instructions:
- Write a formal, professional application email in English
- Do NOT fabricate any achievements or qualifications not listed above
- Keep it concise (3-4 paragraphs)
- Include a subject line as the first line (format: "Subject: <subject text>")
- Then a blank line, then the email body
- Sign with the candidate's full name
- Be genuine and specific to this role"""

        try:
            raw = await client.generate(prompt, temperature=0.3, max_tokens=800)
            lines = raw.strip().split("\n")
            subject = "Application for " + job.title
            body_start = 0
            for i, line in enumerate(lines):
                if line.lower().startswith("subject:"):
                    subject = line.split(":", 1)[1].strip()
                    body_start = i + 1
                    break
            body = "\n".join(lines[body_start:]).strip()
            return subject, body
        except Exception as e:
            logger.warning("Email generation LLM failed: %s", e)
            subject = f"Application for {job.title} — {profile.full_name}"
            body = self._fallback_email(profile, job)
            return subject, body

    def _fallback_email(self, profile: CandidateProfile, job: Job) -> str:
        skills_str = ", ".join(
            s if isinstance(s, str) else s.get("name", str(s))
            for s in (profile.skills or [])[:6]
        )
        return f"""Dear Hiring Manager,

I am writing to express my interest in the {job.title} position at {job.company or 'your company'}.

My name is {profile.full_name} and I have experience with {skills_str or 'relevant technologies'}. {profile.professional_summary or ''}

I am excited about the opportunity to contribute to your team and believe my background aligns well with the requirements described in the job posting.

I have attached my CV for your review. I look forward to hearing from you.

Best regards,
{profile.full_name}
{profile.email}
{profile.phone or ''}"""

    def request_approval(self, draft: ApplicationDraft) -> dict:
        """Return draft details for user review."""
        return {
            "draft_id": draft.id,
            "recipient_email": draft.recipient_email,
            "recipient_verified": draft.recipient_verified,
            "subject": draft.subject,
            "body": draft.body,
            "cv_attached": bool(draft.cv_file_path),
            "content_hash": draft.content_hash,
            "status": draft.status,
        }

    def record_application(
        self, draft: ApplicationDraft, db: Session
    ) -> Application:
        existing = db.query(Application).filter_by(draft_id=draft.id).first()
        if existing:
            return existing
        app = Application(
            profile_id=draft.profile_id,
            job_id=draft.job_id,
            draft_id=draft.id,
            status="approved",
            sent_content_hash=draft.content_hash,
        )
        db.add(app)
        db.flush()
        return app
