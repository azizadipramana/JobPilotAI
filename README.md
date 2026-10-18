# JobPilot AI — Local-First Multi-Agent Job Application Assistant

JobPilot AI is an autonomous, local-first multi-agent application that discovers job vacancies, evaluates candidate-job compatibility, generates tailored CV PDFs, drafts formal application emails, and enforces a **strict cryptographic human-in-the-loop approval gate** before any application can be sent.

Built with **FastAPI**, **React**, **Vite**, **SQLite / MySQL**, and local **Ollama** integration. Runs 100% locally on Windows without Docker or cloud lock-in.

---

## 🌟 Key Features

1. **Autonomous Multi-Agent Workflow**:
   - **Job Discovery Agent**: Searches, parses, and normalizes job vacancies across sources (built-in local source with realistic Indonesian & global roles, or Adzuna global API).
   - **Candidate-Job Matching Agent**: Deterministic scoring across skills, experience, education, and location, supplemented with local LLM qualitative compatibility analysis.
   - **CV Tailoring Agent**: Reorganizes and adapts verified profile evidence into tailored CV PDFs using **ReportLab** and Jinja2 without fabricating credentials.
   - **Email Application Agent**: Discovers verified recruiter mailboxes, drafts tailored application cover letters, and anchors content hashes.

2. **Strict Human-in-the-Loop Safety Gate**:
   - Every application draft is bound to a **SHA-256 cryptographic content hash** spanning the recipient, subject, body, and attached CV.
   - Any modification immediately invalidates prior approvals and increments the draft version.
   - No application can be sent without explicit user review and confirmation.

3. **Local-First & Offline Resilient**:
   - Runs with local **Ollama** (`qwen3:8b` or user choice).
   - If Ollama or external keys are unavailable, built-in intelligent local heuristics allow end-to-end development, testing, scoring, and drafting to continue uninterrupted.
   - Outbound emails in development mode are safely intercepted in local audit storage.

---

## 🏗️ System Architecture

```
[Candidate Profile] ──────► [Job Discovery Agent] ◄────── [Adzuna API / Mock Sources]
                                    │
                                    ▼
                         [Job Matching Agent]
                       (Skills, Edu, Exp, Loc)
                                    │
                                    ▼
                         [CV Tailoring Agent] ──► [ReportLab / PDF]
                                    │
                                    ▼
                      [Email Application Agent]
                                    │
                                    ▼
                     [SHA-256 Approval Gate] ◄─── Explicit User Review
                                    │
                        [Outbound Dispatcher]
                    (Gmail OAuth or Safe Dev Mode)
```

---

## 🚀 Quick Start (Windows)

### 1. Launch with One Click
Double-click `start_app.bat` or run in PowerShell:
```powershell
.\start_app.bat
```
This launches:
- **FastAPI Backend**: [http://127.0.0.1:8000](http://127.0.0.1:8000) (Interactive Swagger Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs))
- **React Frontend**: [http://localhost:5173](http://localhost:5173)

### 2. Manual Startup
**Backend**:
```powershell
cd backend
.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Frontend**:
```powershell
cd frontend
npm.cmd run dev
```

---

## 🧪 Running Tests

The test suite covers matching algorithms, deterministic scoring, mock sources, and cryptographic approval bindings:
```powershell
cd backend
.venv\Scripts\python -m pytest tests/ -v
```
All **28 backend unit & security tests** run and pass in ~0.3s.

---

## ⚙️ Configuration (.env)

Configuration is managed in `backend/.env` (or root `.env`):
| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./jobpilot.db` | Database connection string (SQLite or MySQL) |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Local Ollama endpoint |
| `OLLAMA_MODEL` | `qwen3:8b` | Model used for qualitative reasoning |
| `ADZUNA_APP_ID` | `""` | Optional Adzuna API ID (falls back to mock if empty) |
| `ADZUNA_APP_KEY` | `""` | Optional Adzuna API Key |
| `APP_ENV` | `development` | `development` (safe mock send) or `production` |
