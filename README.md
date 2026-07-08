# AI Data Enrichment Platform

A production-grade, AI-powered platform to automate the enrichment of business datasets — investors, startups, healthcare companies, and any custom dataset — at scale.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **Multi-AI Provider** | Gemini, OpenAI, Anthropic — switch without code changes |
| 📊 **Any Dataset** | Configurable via JSON — investors, VCs, startups, crypto, healthcare |
| 🔄 **Priority Queue** | Async worker pool with pause/resume/stop/retry/scale |
| 🕷️ **Multi-Source Search** | Google, LinkedIn, Crunchbase, SEC, PDF extraction |
| 📡 **Real-Time Dashboard** | SSE-powered live log terminal, progress rings, analytics charts |
| 🔔 **Notifications** | Email, Telegram, Discord, Slack |
| 🗄️ **Any Database** | SQLite (default), PostgreSQL, MySQL — zero code changes |
| 🔐 **Encrypted Secrets** | API keys encrypted with Fernet before storage |
| 🌐 **Browser Automation** | Playwright-based scraping with CAPTCHA pause handling |
| ⏰ **Auto-Scheduler** | Watch folder polling + interrupted job recovery on startup |
| 📦 **Docker Ready** | Single `docker-compose up` deployment |

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- Python 3.11+
- Node.js 20+

### 1. Clone & Setup Backend

```powershell
cd "AI AUTOMATION\backend"
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

```powershell
copy .env.example .env
```

Edit `backend/.env` with:
- `GEMINI_API_KEY=AIza...` ← **required** (get free at [aistudio.google.com](https://aistudio.google.com))
- `ENCRYPTION_KEY=...` ← generate with the command below

```powershell
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 3. Start Backend

```powershell
uvicorn main:app --reload --port 8000
```

### 4. Start Frontend

```powershell
cd "AI AUTOMATION\frontend"
npm install
npm run dev
```

### 5. Open Dashboard

🌐 **Dashboard:** http://localhost:3000  
📚 **API Docs:** http://localhost:8000/api/docs  
❤️ **Health Check:** http://localhost:8000/health

---

## 📁 Project Structure

```
AI AUTOMATION/
├── backend/
│   ├── api/routers/          # FastAPI routers (projects, jobs, workers, settings, logs, analytics, stream)
│   ├── browser/              # Playwright browser automation
│   ├── config/               # Settings, logging
│   ├── core/                 # Queue, Workers, Scheduler, Prompts, Validation
│   ├── db/                   # SQLAlchemy models + repositories
│   ├── providers/            # LLM providers (Gemini, OpenAI, Anthropic)
│   ├── projects/             # Project config JSON files
│   ├── services/             # Enrichment, Import/Export, Notifications
│   ├── sources/              # Data sources (Google, LinkedIn, Crunchbase, SEC, PDF)
│   ├── utils/                # Encryption, validators, file watcher
│   └── main.py               # FastAPI entry point
│
├── frontend/
│   └── src/
│       ├── app/              # Next.js App Router pages
│       ├── components/       # UI components
│       │   ├── dashboard/    # Dashboard widgets
│       │   ├── layout/       # Sidebar, TopBar
│       │   ├── onboarding/   # Onboarding checklist
│       │   ├── settings/     # Settings panels
│       │   └── ui/           # Reusable UI primitives
│       ├── hooks/            # Custom React hooks
│       ├── lib/              # API client, constants
│       └── types/            # TypeScript definitions
│
├── docker-compose.yml        # One-command Docker deployment
└── README.md
```

---

## 🎛️ Adding a New Dataset

No code needed. Create a JSON file in `backend/projects/`:

```json
{
  "project_id": "my_project",
  "name": "Healthcare Companies 2024",
  "description": "Enrich healthcare company contact data",
  "input_columns": ["Company Name", "City", "State"],
  "target_columns": ["CEO Email", "Phone", "Website", "LinkedIn"],
  "search_sources": ["google", "linkedin"],
  "llm_provider": "gemini",
  "prompt_template": "default",
  "validation_rules": {
    "email": true,
    "phone": true,
    "website": true,
    "confidence_threshold": 0.70
  },
  "output": {
    "format": "excel",
    "filename": "healthcare_enriched.xlsx",
    "include_metadata": true
  },
  "concurrency": 5,
  "retries": 3,
  "timeout_seconds": 30
}
```

The platform auto-loads it on restart. You can also create projects from the Settings → Project tab in the UI.

---

## 🔌 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/projects/` | List projects |
| `POST /api/jobs/upload` | Upload dataset & start job |
| `GET /api/jobs/` | List all jobs |
| `POST /api/jobs/{id}/pause` | Pause job |
| `POST /api/jobs/{id}/resume` | Resume job |
| `POST /api/jobs/{id}/stop` | Stop job |
| `POST /api/jobs/{id}/retry-failed` | Retry failed rows |
| `GET /api/jobs/{id}/download` | Download results |
| `GET /api/workers/status` | Worker pool status |
| `GET /api/analytics/summary` | Dashboard metrics |
| `GET /api/stream/logs` | SSE live log stream |
| `GET /api/settings/` | All settings |
| `GET /health` | Health check |

Full interactive docs at http://localhost:8000/api/docs

---

## 🐳 Docker Deployment

```powershell
# Copy and fill in your .env
copy backend\.env.example backend\.env
# Start everything
docker-compose up -d
```

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes* | Gemini Pro API key |
| `ENCRYPTION_KEY` | Yes | Fernet key for secret storage |
| `DATABASE_URL` | No | Default: SQLite |
| `OPENAI_API_KEY` | No | OpenAI API key |
| `ANTHROPIC_API_KEY` | No | Anthropic API key |
| `GOOGLE_SEARCH_API_KEY` | No | Google Custom Search API key |
| `GOOGLE_SEARCH_ENGINE_ID` | No | Google Custom Search Engine ID |
| `TELEGRAM_BOT_TOKEN` | No | Telegram notification bot |
| `DISCORD_WEBHOOK_URL` | No | Discord webhook URL |

*Or provide OpenAI/Anthropic key

---

## 🏗️ Architecture

```
Upload CSV/Excel → Queue Manager (Priority Queue)
                       ↓
               Worker Pool (async, configurable concurrency)
                       ↓
           ┌──── Enrichment Service ────┐
           │                           │
    Search Sources              LLM Provider
    (Google, LinkedIn,    (Gemini/OpenAI/Anthropic)
     Crunchbase, SEC)
           │                           │
           └──────── Validation ────────┘
                          ↓
                   Save to Database
                          ↓
               Export (Excel/CSV/JSON)
                          ↓
                 Notification (Telegram/Email/Discord/Slack)
```

---

Built with ❤️ — FastAPI + Next.js + Three.js + PostgreSQL/SQLite
