## AI Data Analyzer

AI-powered CSV analyzer that lets you upload a dataset, generates a quick statistical summary, and produces plain‑English insights using an LLM. The app is split into a React UI, a Node/Express API, and a Python/Flask analysis microservice backed by PostgreSQL.

> Upload any CSV → get instant statistical analysis + AI-generated business insights

**Live demo:** 


**Built with:** React • Node.js • Python/Flask • PostgreSQL • Groq AI

---

## Tech stack

| Layer            | Technology                      | Purpose                                                                        |
| ---------------- | ------------------------------- | ------------------------------------------------------------------------------ |
| Frontend         | React + Axios                   | File upload UI, charts, results + history views                                |
| API              | Node.js + Express               | Upload endpoint, orchestration, DB writes, calls Python + Groq                 |
| Analysis service | Python + Flask + Pandas         | CSV parsing + profiling (counts, categories, missing values, numeric describe) |
| Database         | PostgreSQL                      | Persist uploads + analysis outputs/insights                                    |
| AI               | Groq AI API (OpenAI-compatible) | Generate business insights text from the computed summary                      |

---

## Features

- **Upload CSV and analyze**: `POST /api/upload` saves the file and triggers analysis.
- **Data summary**: row count, column names, top categories, missing values, numeric summary.
- **AI insights**: generates 3–5 bullet-point insights from the summary via Groq.
- **History**: `GET /api/history` lists past uploads with the generated insights text.
- **Validation & error handling**:
  - Client checks `.csv` extension + max size (10MB)
  - Server checks CSV file type + max size
  - Python service returns structured errors for bad CSVs

---

## Run locally

### Prerequisites

- Node.js (v18+ recommended)
- Python 3.9+ (with `pip`)
- PostgreSQL running locally or a hosted Postgres URL

### 1) Clone & install dependencies

From the repo root:

```bash
cd client
npm install
```

```bash
cd ../server
npm install
```

```bash
cd ../python-service
pip install flask flask-cors pandas
```

> If you use a virtualenv, create/activate it before installing Python deps.

### 2) Configure environment variables

Create `server/.env`:

```env
# Express
PORT=8000

# Postgres
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB_NAME

# Groq
GROQ_API_KEY=your_groq_key_here
```

### 3) Start the services (3 terminals)

#### Terminal A — Python analysis service

```bash
cd python-service
PORT=7001 python3 app.py
```

#### Terminal B — Node/Express API

```bash
cd server
node index.js
```

#### Terminal C — React client

```bash
cd client
npm start
```

Now open the React dev server URL shown in your terminal (usually `http://localhost:3000`).

---

## Folder structure

```text
ai-data-analyzer/
  client/                 # React app (Analyze + History UI)
    src/
      App.js
      index.js
  server/                 # Express API + Postgres integration
    index.js              # /api/upload and /api/history
    db.js                 # pg Pool + initDB schema setup
    openai.js             # Groq (OpenAI-compatible) insights generator
    uploads/              # Saved CSV uploads
    .env                  # Local env vars (not committed)
  python-service/         # Flask microservice for data profiling
    app.py                # /analyze endpoint (pandas summary)
```

---

## API endpoints

- **POST** `http://localhost:8000/api/upload`
  - Form-data field: `file` (CSV)
  - Returns: `upload_id`, `analysisResult`, `insights`
- **GET** `http://localhost:8000/api/history`
  - Returns: array of uploads + `insights_text` (LEFT JOIN)
- **GET** `http://localhost:8000/health`
- **POST** `http://localhost:7001/analyze`
- **GET** `http://localhost:7001/health`

---

## What I learned

- **Service orchestration**: how to chain file upload → Python profiling → AI summarization and keep the response consistent end-to-end.
- **Data edge cases**: why `NaN`/missing values matter for JSON serialization, and how to normalize them safely for APIs and UIs.
- **Full-stack debugging**: tracing a type mismatch across Flask → axios → Express → React and adding safeguards at the boundaries.
- **Database modeling**: designing `uploads` and `analyses` tables and joining them for a useful history view.
- **Frontend UX**: building a clean upload experience with validation, loading states, charts, and dismissible error messages.
