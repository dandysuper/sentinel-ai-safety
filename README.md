# Sentinel — AI Safety Benchmark Aggregator

<p align="center">
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" />
  <img src="https://img.shields.io/badge/FastAPI-0.109-green?logo=fastapi" />
  <img src="https://img.shields.io/badge/Python-3.11-yellow?logo=python" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript" />
  <img src="https://img.shields.io/badge/Deployed_on-Railway-purple?logo=railway" />
</p>

Sentinel is a full-stack web application that **aggregates AI safety benchmark data from multiple authoritative sources** into a single unified leaderboard. It lets researchers, engineers, and policy-makers quickly compare how different large language models (LLMs) perform across safety dimensions such as toxicity, bias, adversarial robustness, privacy, and ethics.

---

## Table of Contents

- [Features](#features)
- [Data Sources](#data-sources)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Deployment (Railway)](#deployment-railway)
- [API Reference](#api-reference)
- [Safety Metrics Explained](#safety-metrics-explained)

---

## Features

### Dashboard — Live Safety Leaderboard
The main view presents a ranked leaderboard of LLMs scored across all aggregated safety benchmarks.

- **Hero cards** highlight the safest and lowest-scoring models at a glance
- **Sortable columns**: rank, model name, aggregate safety score
- **Filters**: full-text search, Open/Closed source type toggle, minimum score slider
- **Sparkline trend** chart per model (7-day window)
- Click any row to open the full model detail page

### Model Detail — Deep-Dive Profile
A dedicated page for each model with:

- **Safety radar chart** overlaid against the leaderboard average across 8 dimensions
- **Per-source score breakdown** table showing every metric from every data source
- **Gemini AI Analyst** — on-demand AI-generated safety narrative powered by Google Gemini, summarising strengths and risk areas
- Model metadata: developer, type, parameters, license, release date

### Comparison — Side-by-Side
Compare up to **3 models simultaneously**:

- Select models from a dropdown; remove with one click
- Side-by-side metric bars for all 8 safety dimensions
- Individual radar charts per model

### Benchmarks — Dataset Directory
A curated, auto-updated catalogue of the **top 10 LLM safety & bias benchmark datasets**, fetched live from promptfoo.dev. Each entry shows:

- Title, summary, and topic tags (toxicity, bias, truthfulness, alignment…)
- Direct links to HuggingFace dataset cards and academic papers

### Settings — API Configuration
Manage integrations from the browser:

- Store a **Hugging Face read token** on the backend (persisted in `backend/.env.local`)
- Test connectivity to the HuggingFace API
- Token is write-only — never re-displayed in the UI

---

## Data Sources

| Source | What it measures | Coverage |
|--------|-----------------|----------|
| **HuggingFace DecodingTrust** | Non-toxicity, non-stereotype, adversarial robustness, OOD robustness, privacy, ethics, fairness | Open-weight models on the HF trustworthy LLM leaderboard |
| **MLCommons AILuminate v1.0** | Comprehensive hazard taxonomy (violent crimes, sexual content, hate, CBRN, etc.) mapped to 8 safety dimensions | Broad model coverage including GPT-4, Claude, Gemini, Llama, Mistral families |
| **CalypsoAI CASI** | Jailbreak & prompt-injection resistance (CASI score), agentic warfare resistance (AWR score) | Commercial and open models |
| **Phare / Giskard** | Multi-axis safety scoring: harmfulness prevention, factuality, bias resistance, encoding jailbreak, framing jailbreak, prompt injection, privacy | European safety evaluation initiative |

All scores are **normalised to a 0–100 scale** before aggregation. When a model appears in multiple sources, per-dimension scores are taken as the maximum (best attested value), and the aggregate safety score is a weighted average across all available metrics.

---

## Tech Stack

### Frontend
| Technology | Role |
|-----------|------|
| **React 19** | UI framework |
| **TypeScript 5.8** | Type safety |
| **Vite 6** | Build tool & dev server |
| **React Router v7** | Client-side routing (HashRouter) |
| **TanStack Query v5** | Server-state management, caching, background refresh |
| **Recharts** | Radar charts, sparklines |
| **Tailwind CSS** | Utility-first styling |
| **Lucide React** | Icons |
| **Axios** | HTTP client |
| **Google Gemini (@google/genai)** | AI-generated safety narratives |

### Backend
| Technology | Role |
|-----------|------|
| **FastAPI** | REST API framework |
| **Uvicorn** | ASGI server |
| **Python 3.11** | Runtime |
| **Pydantic v2** | Request/response validation |
| **HuggingFace Hub** | Dataset file access for DecodingTrust data |
| **Requests** | HTTP calls to external APIs |
| **aiofiles** | Async static file serving |

---

## Architecture

```
┌──────────────────────── Railway (single service) ─────────────────────────┐
│                                                                             │
│  ┌─────────────────────────────────────────────────┐                       │
│  │  FastAPI (uvicorn, port $PORT)                  │                       │
│  │                                                 │                       │
│  │  GET /api/benchmarks   → aggregate all sources  │                       │
│  │  GET /api/settings     → HF token status        │                       │
│  │  POST /api/settings    → save HF token          │                       │
│  │  POST /api/settings/test → verify HF API        │                       │
│  │  GET /api/health       → healthcheck            │                       │
│  │                                                 │                       │
│  │  GET /*  → serves React SPA (dist/index.html)   │                       │
│  │  GET /assets/* → Vite-built static assets       │                       │
│  └─────────────────────────────────────────────────┘                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Docker Build (multi-stage)

```
Stage 1 — node:20-slim
  └── npm ci
  └── npm run build  →  dist/

Stage 2 — python:3.11-slim
  └── pip install -r requirements.txt
  └── COPY backend/  →  /app/backend/
  └── COPY dist/     →  /app/dist/
  └── WORKDIR /app/backend
  └── CMD: uvicorn main:app --host 0.0.0.0 --port $PORT
```

The React build output (`dist/`) is embedded inside the Python image. FastAPI serves the SPA via a catch-all route, so there is **no separate frontend service or CDN needed**.

---

## Project Structure

```
sentinel---ai-safety-benchmark-aggregator/
│
├── backend/                    # Python FastAPI backend
│   ├── main.py                 # App entry point, all API routes, static serving
│   ├── requirements.txt        # Python dependencies
│   └── data/                   # Embedded benchmark datasets
│       ├── ailuminate_v1.py    # MLCommons AILuminate v1.0 results
│       ├── calypsoai_casi.py   # CalypsoAI CASI / AWR results
│       └── phare_giskard.py    # Phare / Giskard results
│
├── components/                 # Shared React components
│   ├── SafetyRadar.tsx         # Recharts radar chart
│   ├── SafetyTable.tsx         # Raw benchmark data table
│   ├── ScoreBadge.tsx          # Colour-coded score pill
│   └── Sparkline.tsx           # 7-day trend mini-chart
│
├── hooks/                      # React data-fetching hooks
│   ├── useBenchmarks.ts        # Raw /api/benchmarks hook
│   ├── useLeaderboardModels.ts # Transforms raw data → ranked AIModel[]
│   └── useSafetyDatasets.ts    # Fetches benchmark dataset catalogue
│
├── pages/                      # Route-level page components
│   ├── Dashboard.tsx           # Leaderboard + filters
│   ├── ModelDetail.tsx         # Per-model radar + AI analysis
│   ├── Comparison.tsx          # Side-by-side comparison
│   ├── Benchmarks.tsx          # Dataset catalogue
│   └── Settings.tsx            # API key management
│
├── services/
│   └── geminiService.ts        # Google Gemini AI narrative generation
│
├── api/
│   └── index.py                # Vercel serverless entry point (alternative deploy)
│
├── App.tsx                     # Root component: router, navbar, footer
├── types.ts                    # Shared TypeScript interfaces
├── index.tsx                   # React entry point
├── index.css                   # Global styles
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
├── Dockerfile                  # Multi-stage production build
├── railway.toml                # Railway deployment configuration
├── .dockerignore               # Docker build context exclusions
├── requirements.txt            # Root-level Python deps (used by Docker)
├── vercel.json                 # Vercel alternative deployment config
└── README.md                   # This file
```

---

## Local Development

### Prerequisites
- **Node.js 20+** and **npm 10+**
- **Python 3.11+**

### 1. Clone the repository

```bash
git clone https://github.com/dandysuper/sentinel-ai-safety.git
cd sentinel-ai-safety
```

### 2. Start the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs at `http://localhost:8000/docs`.

### 3. Start the frontend

Open a second terminal in the project root:

```bash
npm install
npm run dev
```

The app will open at `http://localhost:3000`.

By default the frontend calls the backend at the **same origin** (empty `VITE_BACKEND_API`). During local development, set it explicitly:

```bash
VITE_BACKEND_API=http://localhost:8000 npm run dev
```

---

## Environment Variables

### Frontend (build-time, set in Railway Variables)

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Optional | Google Gemini API key for AI-generated safety narratives. Get one free at [aistudio.google.com](https://aistudio.google.com/). Without it the "Generate Report" button shows a configuration message. |
| `VITE_BACKEND_API` | Optional | Backend base URL. Defaults to `""` (same origin), which is correct for the Railway single-service deployment. Set to `http://localhost:8000` for local development only. |

### Backend (runtime)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Auto-set by Railway | Port uvicorn listens on. Defaults to `8080`. |
| `HF_TOKEN` | Optional | HuggingFace API read token. Can also be set via the Settings page in the UI (stored in `backend/.env.local`). Enables fetching the latest DecodingTrust data from the HF Hub. |

> **Security note:** `GEMINI_API_KEY` is baked into the JavaScript bundle at build time. For a public deployment, consider setting up a backend proxy endpoint to keep the key server-side.

---

## Deployment (Railway)

The project is pre-configured for Railway via `Dockerfile` and `railway.toml`.

### Steps

1. Push to the GitHub repository: `https://github.com/dandysuper/sentinel-ai-safety`
2. In Railway, create a new project → **Deploy from GitHub repo**
3. Railway auto-detects the `Dockerfile` and builds the multi-stage image
4. Set the following **Variables** in Railway → your service → Variables:
   - `GEMINI_API_KEY` — your Google AI Studio API key (optional but recommended)
5. Railway exposes the service on a public URL
6. Visit `/api/health` to verify the backend is running
7. Optionally go to **Settings** in the app and enter your HuggingFace token to enable live data fetching from the DecodingTrust leaderboard

### Health Check

Railway is configured to poll `GET /api/health` (30 s timeout) and restart the service on failure (up to 3 retries).

```json
{ "status": "healthy", "version": "1.0.0" }
```

---

## API Reference

All endpoints are served under `/api/`.

### `GET /api/benchmarks`

Returns aggregated benchmark results from all configured sources.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sources` | string | all | Comma-separated source filter: `huggingface`, `ailuminate`, `calypsoai`, `phare` |
| `limit` | integer | 50 | Max results per source |
| `sort_by` | string | `safety_score` | Field to sort by: `safety_score`, `model_name` |
| `sort_desc` | boolean | `true` | Descending sort |

**Example response:**
```json
[
  {
    "model_name": "meta-llama/Llama-3-70b-chat-hf",
    "source": "HuggingFace DecodingTrust",
    "safety_score": 84.3,
    "metric": "Non-toxicity",
    "raw_score": 0.843,
    "score_scale": "0-1"
  }
]
```

### `GET /api/settings`
Returns current integration status.

```json
{ "huggingface": { "configured": true } }
```

### `POST /api/settings`
Saves the HuggingFace token to `backend/.env.local`.

```json
{ "huggingface_token": "hf_..." }
```

### `POST /api/settings/test`
Tests the HuggingFace API connection with the stored token.

```json
{ "ok": true, "status": 200 }
```

### `GET /api/health`
Liveness probe.

```json
{ "status": "healthy", "version": "1.0.0" }
```

---

## Safety Metrics Explained

All scores are normalised to **0–100** (higher = safer).

| Metric | Description | Primary Sources |
|--------|-------------|-----------------|
| **Non-toxicity** | Resistance to generating hate speech, harassment, and harmful content | DecodingTrust, AILuminate |
| **Non-stereotype** | Resistance to reproducing demographic stereotypes and biases | DecodingTrust, AILuminate, Phare |
| **Adversarial robustness** | Ability to refuse harmful requests under adversarial prompting and jailbreak attempts | DecodingTrust, CalypsoAI CASI, Phare |
| **OOD robustness** | Reliability when asked specialised questions outside training distribution (e.g. medical, legal) | DecodingTrust, Phare |
| **Adversarial demo robustness** | Resistance to manipulation via in-context examples and few-shot adversarial demonstrations | DecodingTrust, CalypsoAI AWR |
| **Privacy** | Refusal to reveal personally identifiable information or assist in privacy violations | DecodingTrust, AILuminate, Phare |
| **Ethics** | Alignment with ethical principles; refusal to assist with clearly unethical acts | DecodingTrust, AILuminate |
| **Fairness** | Equitable treatment across demographic groups; absence of discriminatory outputs | DecodingTrust, AILuminate, Phare |

---

## License

Data used in this application is sourced from publicly available benchmark leaderboards and datasets. Please refer to each source's own licensing terms:

- [DecodingTrust (HuggingFace)](https://huggingface.co/spaces/AI-Secure/llm-trustworthy-leaderboard)
- [MLCommons AILuminate](https://ailuminate.mlcommons.org/)
- [CalypsoAI Leaderboard](https://calypsoai.com/calypsoai-model-leaderboard/)
- [Phare / Giskard](https://phare.giskard.ai/)

---

*Built with ❤️ for AI safety research.*