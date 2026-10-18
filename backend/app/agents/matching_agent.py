from __future__ import annotations

import logging
import re
from typing import Optional

from sqlalchemy.orm import Session

from app.llm.client import get_llm_client
from app.models import CandidateProfile, Job, JobMatch

logger = logging.getLogger(__name__)


class JobMatchingAgent:
    """
    Agent 2 — scores and ranks jobs for a candidate profile.

    Uses a hybrid approach:
    1. Deterministic scoring (skills, location, employment type, keywords)
    2. LLM semantic analysis for nuanced matching
    """

    WEIGHTS = {
        "skill": 0.35,
        "keyword": 0.20,
        "employment_type": 0.15,
        "location": 0.15,
        "education": 0.10,
        "experience": 0.05,
    }

    # ── Tools ──────────────────────────────────────────────────────────────────

    def get_candidate_profile(self, profile_id: int, db: Session) -> Optional[CandidateProfile]:
        return db.get(CandidateProfile, profile_id)

    def extract_requirements(self, job: Job) -> dict:
        """Parse job description for key requirements."""
        text = f"{job.description or ''} {job.requirements or ''}".lower()
        return {
            "raw_text": text,
            "mentions_degree": any(w in text for w in ["bachelor", "degree", "s1", "sarjana", "diploma"]),
            "mentions_intern": any(w in text for w in ["intern", "internship", "magang", "student"]),
        }

    def calculate_match_score(
        self, profile: CandidateProfile, job: Job
    ) -> dict:
        """
        Deterministic scoring. Returns component scores and overall.
        Never claims a candidate meets a requirement without evidence.
        """
        job_text = f"{job.title or ''} {job.description or ''} {job.requirements or ''}".lower()

        # ── Skills ──────────────────────────────────────────────────────────
        profile_skills = [s.lower() if isinstance(s, str) else s.get("name", "").lower()
                         for s in (profile.skills or [])]
        matched = [s for s in profile_skills if s and s in job_text]
        skill_score = min(len(matched) / max(len(profile_skills), 1), 1.0) if profile_skills else 0.0

        # ── Keywords ────────────────────────────────────────────────────────
        keywords = [k.lower() for k in (profile.preferred_keywords or [])]
        kw_hits = sum(1 for kw in keywords if kw in job_text)
        keyword_score = min(kw_hits / max(len(keywords), 1), 1.0) if keywords else 0.5

        # ── Employment type ──────────────────────────────────────────────────
        pref_types = [t.lower() for t in (profile.preferred_employment_types or [])]
        job_type = (job.employment_type or "").lower()
        if not pref_types:
            emp_score = 0.5
        elif job_type and any(pt in job_type or job_type in pt for pt in pref_types):
            emp_score = 1.0
        else:
            emp_score = 0.2

        # ── Location ────────────────────────────────────────────────────────
        pref_locs = [l.lower() for l in (profile.preferred_locations or [])]
        pref_countries = [c.lower() for c in (profile.preferred_countries or [])]
        job_loc = (job.location or "").lower()
        job_country = (job.country or "").lower()

        if not pref_locs and not pref_countries:
            loc_score = 0.5
        elif "remote" in job_loc:
            loc_score = 1.0
        elif any(pl in job_loc for pl in pref_locs):
            loc_score = 1.0
        elif any(pc in job_country for pc in pref_countries):
            loc_score = 0.7
        else:
            loc_score = 0.1

        # ── Education ───────────────────────────────────────────────────────
        education = profile.education or []
        edu_score = min(len(education) * 0.5, 1.0)

        # ── Experience ──────────────────────────────────────────────────────
        experience = profile.experience or []
        exp_score = min(len(experience) * 0.3, 1.0)

        # ── Aggregate ───────────────────────────────────────────────────────
        w = self.WEIGHTS
        overall = (
            skill_score * w["skill"]
            + keyword_score * w["keyword"]
            + emp_score * w["employment_type"]
            + loc_score * w["location"]
            + edu_score * w["education"]
            + exp_score * w["experience"]
        )

        missing = []
        reqs = self.extract_requirements(job)
        if reqs["mentions_degree"] and not education:
            missing.append("Degree/education information not provided in profile")
        if not matched and profile_skills:
            missing.append("No matching skills found in job description")

        return {
            "score": round(overall, 3),
            "skill_score": round(skill_score, 3),
            "keyword_score": round(keyword_score, 3),
            "employment_type_score": round(emp_score, 3),
            "location_score": round(loc_score, 3),
            "education_score": round(edu_score, 3),
            "experience_score": round(exp_score, 3),
            "matched_skills": matched,
            "missing_requirements": missing,
        }

    async def get_llm_analysis(
        self, profile: CandidateProfile, job: Job, score_data: dict
    ) -> str:
        """LLM semantic analysis — supplemental, not authoritative."""
        client = get_llm_client()
        prompt = f"""You are a career advisor evaluating job-candidate compatibility.

Candidate Profile:
- Name: {profile.full_name}
- Skills: {', '.join(profile.skills or []) if isinstance((profile.skills or [None])[0] if profile.skills else None, str) else str(profile.skills)}
- Summary: {profile.professional_summary or 'Not provided'}

Job:
- Title: {job.title}
- Company: {job.company or 'Unknown'}
- Description (excerpt): {(job.description or '')[:800]}

Match Score: {score_data['score']} / 1.0
Matched Skills: {score_data['matched_skills']}
Missing: {score_data['missing_requirements']}

In 2-3 sentences, explain why this job does or does not fit the candidate.
Only mention qualifications that are actually present in the profile.
Be honest about gaps. Do NOT fabricate any information."""

        try:
            return await client.generate(prompt, temperature=0.2, max_tokens=300)
        except Exception as e:
            logger.warning("LLM analysis failed: %s", e)
            return f"LLM analysis unavailable: {e}"

    def save_match(
        self,
        profile_id: int,
        job: Job,
        score_data: dict,
        llm_analysis: str,
        db: Session,
    ) -> JobMatch:
        existing = db.query(JobMatch).filter_by(profile_id=profile_id, job_id=job.id).first()
        if existing:
            existing.score = score_data["score"]
            existing.skill_score = score_data["skill_score"]
            existing.experience_score = score_data["experience_score"]
            existing.education_score = score_data["education_score"]
            existing.location_score = score_data["location_score"]
            existing.keyword_score = score_data["keyword_score"]
            existing.matched_skills = score_data["matched_skills"]
            existing.missing_requirements = score_data["missing_requirements"]
            existing.llm_analysis = llm_analysis
            existing.explanation = self._build_explanation(score_data, llm_analysis)
            return existing

        match = JobMatch(
            profile_id=profile_id,
            job_id=job.id,
            score=score_data["score"],
            skill_score=score_data["skill_score"],
            experience_score=score_data["experience_score"],
            education_score=score_data["education_score"],
            location_score=score_data["location_score"],
            keyword_score=score_data["keyword_score"],
            matched_skills=score_data["matched_skills"],
            missing_requirements=score_data["missing_requirements"],
            llm_analysis=llm_analysis,
            explanation=self._build_explanation(score_data, llm_analysis),
        )
        db.add(match)
        return match

    def _build_explanation(self, score_data: dict, llm_analysis: str) -> str:
        lines = [
            f"Overall match: {score_data['score'] * 100:.0f}%",
            f"Skills: {score_data['skill_score'] * 100:.0f}%",
            f"Location: {score_data['location_score'] * 100:.0f}%",
            f"Employment type: {score_data['employment_type_score'] * 100:.0f}%",
        ]
        if score_data["matched_skills"]:
            lines.append(f"Matched skills: {', '.join(score_data['matched_skills'])}")
        if score_data["missing_requirements"]:
            lines.append(f"Gaps: {'; '.join(score_data['missing_requirements'])}")
        lines.append(f"\n{llm_analysis}")
        return "\n".join(lines)

    async def run(
        self,
        profile_id: int,
        job_ids: list[int],
        db: Session,
    ) -> list[JobMatch]:
        profile = self.get_candidate_profile(profile_id, db)
        if not profile:
            logger.error("Profile %d not found", profile_id)
            return []

        matches = []
        for job_id in job_ids:
            job = db.get(Job, job_id)
            if not job:
                continue
            try:
                score_data = self.calculate_match_score(profile, job)
                llm_analysis = await self.get_llm_analysis(profile, job, score_data)
                match = self.save_match(profile_id, job, score_data, llm_analysis, db)
                matches.append(match)
            except Exception as e:
                logger.error("Failed to match job %d: %s", job_id, e)

        db.flush()
        db.commit()
        matches.sort(key=lambda m: m.score, reverse=True)
        return matches
