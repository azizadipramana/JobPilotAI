from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.agents.job_sources.base import JobSource
from app.agents.job_sources.schema import NormalizedJob

_COMPANIES = [
    "Tokopedia", "Gojek", "Bukalapak", "Traveloka", "Ruangguru",
    "Shopee Indonesia", "Grab Indonesia", "OVO", "Dana", "LinkAja",
    "Accenture Indonesia", "Deloitte Indonesia", "IBM Indonesia",
    "Microsoft Indonesia", "Google Indonesia",
]
_EMPLOYMENT_TYPES = ["full_time", "part_time", "internship", "contract"]
_LOCATIONS = ["Jakarta", "Bandung", "Surabaya", "Yogyakarta", "Bali", "Remote"]
_JOB_TEMPLATES = [
    {
        "title": "Software Engineer",
        "description": (
            "We are looking for a passionate Software Engineer to design, develop, and "
            "maintain high-quality software solutions. You will work in an agile team "
            "on exciting products used by millions of users.\n\n"
            "Requirements:\n"
            "- Bachelor's degree in Computer Science or related field\n"
            "- Proficiency in Python, JavaScript, or Java\n"
            "- Experience with REST APIs and microservices\n"
            "- Familiarity with Git, CI/CD pipelines\n"
            "- Strong problem-solving skills"
        ),
    },
    {
        "title": "Data Science Intern",
        "description": (
            "Join our data team and work on real-world machine learning problems. "
            "This internship is perfect for students or fresh graduates.\n\n"
            "Requirements:\n"
            "- Currently pursuing or recently graduated in Statistics, CS, or Math\n"
            "- Proficiency in Python (pandas, scikit-learn, numpy)\n"
            "- Understanding of ML fundamentals\n"
            "- Good analytical and communication skills"
        ),
    },
    {
        "title": "Frontend Developer",
        "description": (
            "Build beautiful and performant user interfaces for our web platform.\n\n"
            "Requirements:\n"
            "- 1+ years experience with React or Vue.js\n"
            "- Proficiency in HTML, CSS, JavaScript/TypeScript\n"
            "- Understanding of responsive design\n"
            "- Experience with REST API integration\n"
            "- Attention to detail and pixel-perfect execution"
        ),
    },
    {
        "title": "Backend Engineer (Python)",
        "description": (
            "Design and implement scalable backend services.\n\n"
            "Requirements:\n"
            "- 2+ years Python experience\n"
            "- Experience with FastAPI or Django\n"
            "- Database design skills (MySQL, PostgreSQL)\n"
            "- Understanding of system design and scalability\n"
            "- Experience with Docker and cloud services"
        ),
    },
    {
        "title": "Machine Learning Engineer",
        "description": (
            "Build and deploy ML models at scale.\n\n"
            "Requirements:\n"
            "- Experience with TensorFlow or PyTorch\n"
            "- Strong Python skills\n"
            "- Understanding of ML Ops and model deployment\n"
            "- Experience with feature engineering and model evaluation"
        ),
    },
    {
        "title": "Product Manager Intern",
        "description": (
            "Work closely with engineering and design teams to define and ship products.\n\n"
            "Requirements:\n"
            "- Strong analytical thinking\n"
            "- Good communication skills (Bahasa Indonesia + English)\n"
            "- Basic understanding of software development\n"
            "- Passion for technology products"
        ),
    },
    {
        "title": "DevOps Engineer",
        "description": (
            "Maintain and improve our infrastructure and deployment pipelines.\n\n"
            "Requirements:\n"
            "- Experience with Linux, bash scripting\n"
            "- Kubernetes, Docker expertise\n"
            "- CI/CD (GitHub Actions, Jenkins)\n"
            "- Cloud platforms (AWS/GCP/Azure)\n"
            "- Infrastructure-as-code (Terraform)"
        ),
    },
    {
        "title": "Full Stack Developer",
        "description": (
            "Work on both frontend and backend of our platform.\n\n"
            "Requirements:\n"
            "- 2+ years full stack experience\n"
            "- React or Next.js for frontend\n"
            "- Node.js or Python for backend\n"
            "- Database experience (SQL/NoSQL)\n"
            "- API design and integration"
        ),
    },
]


class MockJobSource(JobSource):
    """
    Generates realistic fake job listings for development and testing.
    No external credentials required.
    """

    name = "mock"

    async def search(
        self,
        keywords: list[str],
        country: str = "id",
        location: Optional[str] = None,
        employment_type: Optional[str] = None,
        max_results: int = 20,
    ) -> list[NormalizedJob]:
        jobs = []
        templates = _JOB_TEMPLATES[:]

        # Filter templates by keyword relevance
        if keywords:
            kw_lower = [k.lower() for k in keywords]
            filtered = [
                t for t in templates
                if any(kw in t["title"].lower() or kw in t["description"].lower() for kw in kw_lower)
            ]
            if filtered:
                templates = filtered

        for i in range(min(max_results, 20)):
            tmpl = templates[i % len(templates)]
            company = _COMPANIES[i % len(_COMPANIES)]
            loc = location or _LOCATIONS[i % len(_LOCATIONS)]
            emp_type = employment_type or _EMPLOYMENT_TYPES[i % len(_EMPLOYMENT_TYPES)]
            days_ago = i % 30
            source_id = f"mock-{country.lower()}-{i:04d}"

            jobs.append(
                NormalizedJob(
                    source="mock",
                    source_id=source_id,
                    title=tmpl["title"],
                    company=company,
                    location=loc,
                    country=country.upper(),
                    employment_type=emp_type,
                    description=tmpl["description"],
                    salary_min=4_000_000 if i % 2 == 0 else 6_000_000,
                    salary_max=10_000_000 if i % 2 == 0 else 15_000_000,
                    salary_currency="IDR",
                    application_url=f"https://jobs.example.com/{source_id}",
                    application_email=f"jobs@{company.lower().replace(' ', '')}.co.id",
                    posted_at=datetime.now(timezone.utc) - timedelta(days=days_ago),
                    raw_data={"template_index": i % len(_JOB_TEMPLATES)},
                )
            )

        return jobs
