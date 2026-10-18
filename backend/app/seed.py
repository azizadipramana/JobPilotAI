from __future__ import annotations

import logging
from sqlalchemy.orm import Session
from app.database import SessionLocal, Base, engine
from app.models import CandidateProfile, Job, JobMatch

logger = logging.getLogger(__name__)

DEFAULT_PROFILE = {
    "full_name": "Aziz Pratama",
    "email": "aziz.pratama@example.com",
    "phone": "+62 812-3456-7890",
    "location": "Jakarta, Indonesia",
    "linkedin_url": "https://linkedin.com/in/aziz-pratama",
    "github_url": "https://github.com/azizpratama",
    "portfolio_url": "https://azizpratama.dev",
    "professional_summary": (
        "Passionate Full-Stack & AI Software Engineer with strong background in Python, "
        "FastAPI, React, TypeScript, and local LLM integrations. Experienced in building "
        "scalable web applications, automated workflows, and data pipelines."
    ),
    "skills": [
        "Python", "FastAPI", "React", "TypeScript", "SQL", "PostgreSQL", 
        "Docker", "Git", "REST APIs", "Tailwind CSS", "Ollama", "Machine Learning"
    ],
    "education": [
        {
            "degree": "Bachelor of Computer Science (S.Kom)",
            "institution": "Universitas Indonesia",
            "year": "2020 - 2024",
            "gpa": "3.85 / 4.00"
        }
    ],
    "experience": [
        {
            "title": "Junior Full Stack Developer",
            "company": "Nusantara Digital Solusindo",
            "location": "Jakarta, Indonesia",
            "period": "2023 - Present",
            "description": "Developed backend microservices using FastAPI and interactive frontend dashboards using React and Vite."
        },
        {
            "title": "Software Engineering Intern",
            "company": "Inovasi Karya Cloud",
            "location": "Remote",
            "period": "2022 - 2023",
            "description": "Integrated third-party APIs and automated daily ETL pipelines using Python and SQL."
        }
    ],
    "projects": [
        {
            "name": "JobPilot AI",
            "description": "Local-first multi-agent job application orchestrator with local LLM integration and tailored CV rendering.",
            "tech": "FastAPI, React, Ollama, SQLAlchemy"
        },
        {
            "name": "HealthPulse Analytics",
            "description": "Real-time telemetry and patient metrics dashboard with predictive alerting.",
            "tech": "Python, React, WebSockets"
        }
    ],
    "certifications": [
        {"name": "AWS Certified Cloud Practitioner", "issuer": "Amazon Web Services", "year": "2023"},
        {"name": "Python Professional Developer", "issuer": "Python Institute", "year": "2022"}
    ],
    "preferred_locations": ["Jakarta", "Bandung", "Remote"],
    "preferred_countries": ["id", "sg"],
    "preferred_employment_types": ["full_time", "internship", "contract"],
    "preferred_keywords": ["python", "fastapi", "react", "software engineer", "full stack", "ai engineer"],
    "min_salary": 8000000,
    "max_salary": 20000000,
}


def seed_db():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        profile = db.query(CandidateProfile).filter_by(email=DEFAULT_PROFILE["email"]).first()
        if not profile:
            profile = CandidateProfile(**DEFAULT_PROFILE)
            db.add(profile)
            db.commit()
            db.refresh(profile)
            print(f"[OK] Seeded candidate profile: {profile.full_name} (ID: {profile.id})")
        else:
            print(f"[INFO] Candidate profile already exists: {profile.full_name} (ID: {profile.id})")

        # Also populate some initial mock jobs if none exist
        job_count = db.query(Job).count()
        if job_count == 0:
            from app.agents.job_sources.mock_source import MockJobSource
            import asyncio
            source = MockJobSource()
            jobs = asyncio.run(source.search(
                keywords=["python", "full stack", "software engineer", "frontend"],
                country="id",
                max_results=12
            ))
            for nj in jobs:
                db_job = Job(
                    source=nj.source,
                    source_id=nj.source_id,
                    title=nj.title,
                    company=nj.company,
                    location=nj.location,
                    country=nj.country,
                    employment_type=nj.employment_type,
                    description=nj.description,
                    salary_min=nj.salary_min,
                    salary_max=nj.salary_max,
                    salary_currency=nj.salary_currency,
                    application_url=nj.application_url,
                    application_email=nj.application_email,
                    posted_at=nj.posted_at,
                    raw_data=nj.raw_data,
                )
                db.add(db_job)
            db.commit()
            print(f"[OK] Seeded {len(jobs)} initial mock jobs")

            # Run matching for this profile
            from app.agents.matching_agent import JobMatchingAgent
            matcher = JobMatchingAgent()
            db_jobs = db.query(Job).all()
            asyncio.run(matcher.run(profile.id, [j.id for j in db_jobs], db))
            print(f"[OK] Computed initial matches for {profile.full_name}")

    finally:
        db.close()


if __name__ == "__main__":
    seed_db()
