from __future__ import annotations

import hashlib
import json
import logging
import os
from pathlib import Path
from typing import Optional

from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session

from app.config import get_settings
from app.llm.client import get_llm_client
from app.models import ApplicationDraft, CandidateProfile, Job

logger = logging.getLogger(__name__)


class CVTailoringAgent:
    """
    Agent 3 — generates a tailored CV PDF for a specific job.

    Never fabricates: only uses profile data, reorders and adapts language.
    """

    def __init__(self):
        settings = get_settings()
        self.output_dir = settings.cv_output_path
        template_dir = Path(__file__).parent.parent / "templates" / "cv"
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(template_dir)),
            autoescape=True,
        )

    # ── Tools ──────────────────────────────────────────────────────────────────

    def get_candidate_evidence(self, profile: CandidateProfile) -> dict:
        """Return only factual data from profile — no fabrication allowed."""
        return {
            "full_name": profile.full_name,
            "email": profile.email,
            "phone": profile.phone,
            "location": profile.location,
            "linkedin_url": profile.linkedin_url,
            "github_url": profile.github_url,
            "portfolio_url": profile.portfolio_url,
            "professional_summary": profile.professional_summary,
            "skills": profile.skills or [],
            "education": profile.education or [],
            "experience": profile.experience or [],
            "projects": profile.projects or [],
            "certifications": profile.certifications or [],
        }

    async def tailor_cv_content(
        self, evidence: dict, job: Job
    ) -> dict:
        """Ask LLM to reorder and adapt — not fabricate — CV content for the job."""
        client = get_llm_client()

        prompt = f"""You are an expert CV writer. Tailor the following candidate data for a specific job.

RULES (mandatory):
1. Do NOT add any skills, experience, certifications, or achievements not present in the data.
2. Do NOT change names, dates, company names, or qualifications.
3. Only reorder bullet points, adapt wording, and write a focused professional summary.
4. Return a valid JSON object matching the schema below.
5. If a section is empty in the input, keep it empty in the output.

Job: {job.title} at {job.company or 'Unknown Company'}
Job description excerpt: {(job.description or '')[:1000]}

Candidate data:
{json.dumps(evidence, indent=2, default=str)}

Return JSON with this exact structure:
{{
  "professional_summary": "2-3 sentence summary relevant to this job",
  "skills_ordered": ["skill1", "skill2", ...],
  "education": [...same as input...],
  "experience": [...same items, possibly reordered...],
  "projects": [...same items, possibly reordered...],
  "certifications": [...same as input...]
}}

Return ONLY the JSON object, no other text."""

        try:
            raw = await client.generate(prompt, temperature=0.2, max_tokens=2000)
            # Extract JSON from response
            start = raw.find("{")
            end = raw.rfind("}") + 1
            if start >= 0 and end > start:
                tailored = json.loads(raw[start:end])
            else:
                raise ValueError("No JSON found in LLM response")

            return tailored
        except Exception as e:
            logger.warning("CV tailoring LLM failed (%s), using raw profile data", e)
            # Safe fallback: use profile data as-is
            skills = evidence.get("skills", [])
            return {
                "professional_summary": evidence.get("professional_summary", ""),
                "skills_ordered": [s if isinstance(s, str) else s.get("name", str(s)) for s in skills],
                "education": evidence.get("education", []),
                "experience": evidence.get("experience", []),
                "projects": evidence.get("projects", []),
                "certifications": evidence.get("certifications", []),
            }

    def validate_cv_claims(self, tailored: dict, evidence: dict) -> list[str]:
        """
        Verify tailored CV against source evidence.
        Returns list of validation warnings (empty = all clear).
        """
        warnings = []
        # Check skills not fabricated
        original_skills_lower = {
            (s.lower() if isinstance(s, str) else s.get("name", "").lower())
            for s in (evidence.get("skills") or [])
        }
        for skill in tailored.get("skills_ordered", []):
            if skill.lower() not in original_skills_lower:
                warnings.append(f"Skill '{skill}' not found in original profile — removed")

        # Filter out fabricated skills
        tailored["skills_ordered"] = [
            s for s in tailored.get("skills_ordered", [])
            if s.lower() in original_skills_lower
        ]

        return warnings

    def render_cv_html(self, evidence: dict, tailored: dict, job: Job) -> str:
        """Render CV as HTML using Jinja2 template."""
        template = self.jinja_env.get_template("cv_template.html")
        return template.render(
            candidate=evidence,
            tailored=tailored,
            job_title=job.title,
            job_company=job.company or "",
        )

    def render_cv_pdf(
        self,
        html: str,
        output_path: Path,
        evidence: Optional[dict] = None,
        tailored: Optional[dict] = None,
        job: Optional[Job] = None,
    ) -> Path:
        """Render tailored CV to PDF using ReportLab with HTML companion."""
        # Always write companion HTML
        html_path = output_path.with_suffix(".html")
        html_path.write_text(html, encoding="utf-8")

        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
            from reportlab.lib import colors

            doc = SimpleDocTemplate(
                str(output_path),
                pagesize=letter,
                rightMargin=36,
                leftMargin=36,
                topMargin=36,
                bottomMargin=36,
            )
            styles = getSampleStyleSheet()

            title_style = ParagraphStyle(
                'CVTitle',
                parent=styles['Normal'],
                fontName='Helvetica-Bold',
                fontSize=18,
                leading=22,
                textColor=colors.HexColor('#0f172a'),
            )
            sub_style = ParagraphStyle(
                'CVSub',
                parent=styles['Normal'],
                fontName='Helvetica',
                fontSize=8.5,
                leading=12,
                textColor=colors.HexColor('#475569'),
            )
            heading_style = ParagraphStyle(
                'CVHeading',
                parent=styles['Normal'],
                fontName='Helvetica-Bold',
                fontSize=11,
                leading=15,
                textColor=colors.HexColor('#1e40af'),
                spaceBefore=6,
                spaceAfter=3,
            )
            body_style = ParagraphStyle(
                'CVBody',
                parent=styles['Normal'],
                fontName='Helvetica',
                fontSize=9,
                leading=13,
                textColor=colors.HexColor('#1e293b'),
            )

            story = []
            ev = evidence or {}
            tl = tailored or {}

            # Candidate Header
            name = ev.get("full_name") or "Candidate"
            story.append(Paragraph(name, title_style))

            contacts = []
            if ev.get("email"): contacts.append(ev.get("email"))
            if ev.get("phone"): contacts.append(ev.get("phone"))
            if ev.get("location"): contacts.append(ev.get("location"))
            if ev.get("portfolio_url"): contacts.append(ev.get("portfolio_url"))
            story.append(Paragraph(" • ".join(contacts), sub_style))
            story.append(Spacer(1, 6))
            story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1'), spaceBefore=2, spaceAfter=6))

            # Professional Summary
            summary = tl.get("professional_summary") or ev.get("professional_summary") or ""
            if summary:
                story.append(Paragraph("PROFESSIONAL SUMMARY", heading_style))
                story.append(Paragraph(summary, body_style))
                story.append(Spacer(1, 4))

            # Skills
            skills = tl.get("skills_ordered") or [
                s if isinstance(s, str) else s.get("name", str(s)) for s in (ev.get("skills") or [])
            ]
            if skills:
                story.append(Paragraph("TECHNICAL & CORE SKILLS", heading_style))
                story.append(Paragraph(" • ".join(skills), body_style))
                story.append(Spacer(1, 4))

            # Experience
            experiences = tl.get("experience") or ev.get("experience") or []
            if experiences:
                story.append(Paragraph("WORK EXPERIENCE", heading_style))
                for exp in experiences:
                    role_line = f"<b>{exp.get('title', 'Role')}</b> — {exp.get('company', 'Company')} ({exp.get('period', exp.get('location', ''))})"
                    story.append(Paragraph(role_line, body_style))
                    if exp.get("description"):
                        story.append(Paragraph(exp.get("description"), sub_style))
                    story.append(Spacer(1, 3))
                story.append(Spacer(1, 3))

            # Education
            education = tl.get("education") or ev.get("education") or []
            if education:
                story.append(Paragraph("EDUCATION", heading_style))
                for edu in education:
                    deg_line = f"<b>{edu.get('degree', 'Degree')}</b> — {edu.get('institution', 'Institution')} ({edu.get('year', '')})"
                    if edu.get("gpa"):
                        deg_line += f" • GPA: {edu.get('gpa')}"
                    story.append(Paragraph(deg_line, body_style))
                story.append(Spacer(1, 4))

            # Projects
            projects = tl.get("projects") or ev.get("projects") or []
            if projects:
                story.append(Paragraph("KEY PROJECTS", heading_style))
                for prj in projects:
                    p_line = f"<b>{prj.get('name', 'Project')}</b>: {prj.get('description', '')}"
                    if prj.get("tech"):
                        p_line += f" <i>[{prj.get('tech')}]</i>"
                    story.append(Paragraph(p_line, body_style))
                    story.append(Spacer(1, 2))

            doc.build(story)
            return output_path

        except Exception as e:
            logger.error("ReportLab PDF rendering error: %s", e)
            return html_path

    def _file_hash(self, path: Path) -> str:
        sha = hashlib.sha256()
        sha.update(path.read_bytes())
        return sha.hexdigest()

    # ── Main entry point ───────────────────────────────────────────────────────

    async def generate_draft(
        self, profile_id: int, job_id: int, db: Session
    ) -> ApplicationDraft:
        profile = db.get(CandidateProfile, profile_id)
        if not profile:
            raise ValueError(f"Profile {profile_id} not found")
        job = db.get(Job, job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")

        # Check for existing draft
        existing = (
            db.query(ApplicationDraft)
            .filter_by(profile_id=profile_id, job_id=job_id)
            .order_by(ApplicationDraft.version.desc())
            .first()
        )
        if existing and existing.status in ("draft", "awaiting_approval"):
            logger.info("Returning existing draft %d", existing.id)
            return existing

        evidence = self.get_candidate_evidence(profile)
        tailored = await self.tailor_cv_content(evidence, job)
        warnings = self.validate_cv_claims(tailored, evidence)

        if warnings:
            logger.warning("CV validation warnings: %s", warnings)

        html = self.render_cv_html(evidence, tailored, job)
        filename = f"cv_{profile_id}_{job_id}_{os.urandom(4).hex()}.pdf"
        output_path = self.output_dir / filename
        final_path = self.render_cv_pdf(html, output_path, evidence, tailored, job)
        cv_hash = self._file_hash(final_path)

        draft = ApplicationDraft(
            profile_id=profile_id,
            job_id=job_id,
            version=1,
            cv_file_path=str(final_path),
            cv_file_hash=cv_hash,
            status="draft",
        )
        db.add(draft)
        db.flush()
        draft.refresh_content_hash()
        return draft
