# SOVEREIGN

Sovereign medical data platform: **Clinic + Meet + Medprom** in one monorepo.

**Status:** early developer scaffold / demo. Not production-ready.
**Data rule:** no real patients. The only test patient is `Test Test`, date of birth `1990-01-01`.

---

## 1. Idea

SOVEREIGN is a self-hosted medical platform that keeps clinic data inside infrastructure the operator controls. It combines three user-facing applications and one backend:

- **Clinic** — patient records and appointments for clinic staff.
- **Meet** — secure video consultation rooms for doctors and patients.
- **Medprom** — medical promotion / directory for clinics, doctors and medical services.
- **API** — HTTP API and business logic.
- **Async engine** — in-memory job queue for heavy work outside clinic hours.

### Who it is for

| User | What they use |
| --- | --- |
| Clinic doctor / staff | Clinic dashboard, patient list, appointments |
| Patient | Meet consultation room, future patient-facing services |
| Medical promoter / directory visitor | Medprom listings and profiles |
| Clinic operator / developer | API, Postgres, async engine, deployment |
| Compliance / security owner | Audit logs, access control, encryption, retention |

### Problem it solves

Small clinics often run records, video calls and medical promotion in separate tools, with patient data leaving the clinic's control. SOVEREIGN puts all three in one deployable stack with:

- one database and one API;
- explicit ports per application;
- clinic isolation by `clinic_code`;
- a schema designed for encrypted prescriptions;
- a night window for heavy background jobs.

### Current reality vs target

The current repo is a **working scaffold**, not a finished product.

- **Implemented now:** clinic login and patient list, appointments API, Postgres schema, async-engine queue/router/night window, three Vite apps on fixed ports.
- **Mock only:** Meet rooms, Medprom promotions.
- **Target architecture, not implemented in this repo:** Vault Transit encryption, FHIR interoperability, RC service, structured log control, real authentication, RBAC, WebRTC, patient portal.

> The older `clinic-sovereing` README preview mentions "Legacy Vault scripts only — NOT IMPLEMENTED in current API (see SECURITY.md)" and Vault Transit. That code is **not present in this repository**. Do not describe Vault or FHIR as delivered until the code and tests exist here.

---

## 2. Services and ports

| Service | Port | What it does | Primary user | Current state |
| --- | ---: | --- | --- | --- |
| Clinic | **5175** | Vite + React login and patient list; proxies `/api` to the API | Clinic doctor / staff | Works with API; falls back to mocks if API is offline |
| Meet | **5176** | Vite + React login and test room placeholder | Doctor / patient | Mock only; no WebRTC, no DB |
| Medprom | **5177** | Vite + React login and promotions placeholder | Medical promoter / directory visitor | Mock only; no directory, no DB |
| API | **3001** | Express API: health, login, patients, appointments | Frontends / operators | Running; database missing in the current environment |
| Postgres | **5432** | Main relational database | API / migrations | Running; database `sovereign` does not exist yet |
| Async engine | **no port** | In-memory queue, router and night-window rule | Internal workers | Library; type-checks, no worker process |
| Vault Transit | **no port** | Encryption target for phone/PII/prescriptions | API | **Not implemented** |
| RC | **no port** | No service named RC exists in this repo | n/a | **Not implemented** |

### URLs

| URL | Service |
| --- | --- |
| `http://localhost:5175` | Clinic |
| `http://localhost:5176` | Meet |
| `http://localhost:5177` | Medprom |
| `http://localhost:3001/health` | API health |
| `http://localhost:3001/api/...` | API endpoints |

---

## 3. Run locally

### Prerequisites

- Node.js 18+ (current environment: Node 18.19.1)
- npm 9+
- Postgres 16 (optional if you only want mock frontends)

### Steps

```bash
# 1. Environment file
cp .env.example .env

# 2. Edit .env and fill: DATABASE_URL, API_PORT, DEMO_LOGIN, DEMO_PASSWORD,
#    DEMO_CLINIC_CODE (see .env.example).

# 3. Install workspace dependencies from the repo root
npm install

# 4. Create the database if it does not exist
createdb sovereign
# or: psql -c 'CREATE DATABASE sovereign;'

# 5. Apply the schema
npm run db:migrate

# 6. Start the API
npm run dev:api

# 7. Start all workspace dev servers
npm run dev
# This runs every workspace that has a dev script:
# API :3001 + Clinic :5175 + Meet :5176 + Medprom :5177
```

Individual frontends:

```bash
npm run dev:clinic
npm run dev:meet
npm run dev:medprom
```

Build and checks:

```bash
npm run build
npm run db:check
npm run check --workspace @sovereign/async-engine
```

### Demo login

```
login:    doctor
password: test123 (dev only; API reads DEMO_LOGIN/DEMO_PASSWORD from .env, blocked when NODE_ENV=production)
```

### Health check

```bash
curl http://localhost:3001/health
```

A healthy response is HTTP 200 with `db.ok: true`. When Postgres is unreachable the API returns HTTP 503 with `db.ok: false`.

---

## 4. API endpoints

| Method | Path | Purpose | Auth | Current state |
| --- | --- | --- | --- | --- |
| `GET` | `/health` | Process and database check | None | Returns `ok: true`; `db.ok` depends on Postgres |
| `POST` | `/api/login` | Demo login | None | Env-based demo check (`DEMO_LOGIN`/`DEMO_PASSWORD`); returns `clinicCode` |
| `GET` | `/api/patients` | List patients for `DEMO` | None | 500 when database is missing; otherwise Postgres |
| `GET` | `/api/appointments` | List latest 50 appointments for `DEMO` | None | 500 when database is missing; otherwise Postgres |
| `POST` | `/api/appointments` | Create appointment | None | Requires `patientId` and `startsAt`; writes to Postgres |
| any | unknown path | Default Express 404 | None | HTML 404, not JSON |

The API reads `DEMO_CLINIC_CODE` (default `DEMO`) and enforces it via RLS (`0002_rls_clinic.sql`). There is no token, session, RBAC, rate limiting, CORS policy or security-header middleware (open TAS15).

---

## 5. Repository map

| Path | What it contains |
| --- | --- |
| `apps/clinic` | Clinic Vite + React app, port 5175 |
| `apps/meet` | Meet Vite + React app, port 5176 |
| `apps/medprom` | Medprom Vite + React app, port 5177 |
| `apps/api` | Express API, port 3001 |
| `packages/db` | Postgres pool, queries and migration runner |
| `packages/async-engine` | In-memory queue, router and night window |
| `db/migrations` | Postgres schema migrations |
| `src/data/mockData.ts` | Demo/fallback mock data and example SQL |
| `src/services/sqliteWasm.ts` | Browser-local SQLite WASM cache |
| `README.md` | This file |
| `ARCHITECTURE.md` | Directories, services, ports, data flow and schema |
| `FUNCTIONS.md` | Function inventory and Medprom vs Sovereign comparison |
| `IDEAS.md` | What to take from Medprom and what not to take |
| `TASKS.md` | Task status, including TAS12, TAS13 and TAS14 |
| `LOGS.md` | Log analysis and runtime findings |
| `SECURITY.md` | Secrets, git hygiene and security checklist |

---

## 6. Environment variables

| Variable | Required | Read by | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes for DB features | `packages/db`, migration runner, API | Never hardcode or commit a real connection string |
| `API_PORT` | No | API | Defaults to `3001` |
| `DEMO_LOGIN` | No | API | Demo login; disabled when `NODE_ENV=production` |
| `DEMO_PASSWORD` | No | API | Demo password; disabled when `NODE_ENV=production` |
A local `.env` exists and is ignored by git. Its contents are not documented or reproduced here. Use `.env.example` as the only documented template. See `SECURITY.md`.

---

## 7. Data and security rules

- Test patient only: `Test Test`, `1990-01-01`.
- Every query is scoped by `clinic_code`; the API currently uses `DEMO`.
- Prescriptions are stored as `encrypted_blob BYTEA`; encryption code is not implemented.
- Heavy jobs run only between **23:00 and 06:00** local time.
- Secrets live in `.env` or a vault, never in git.
- `.env` is ignored; `.env.example` is the placeholder template. Do not add real values to it.
- Do not log patient names, doses, tokens, passwords or connection strings.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `/health` returns `db.ok: false` | Database `sovereign` does not exist | Create the database and run `npm run db:migrate` |
| `/api/patients` or `/api/appointments` returns 500 | Same missing database | Fix the DB, then retry |
| `Cannot find package 'dotenv'` after a watch restart | API restarted before root dependencies finished installing | Run `npm install` at the repo root and restart the API |
| Clinic shows mock data silently | API is offline; the clinic client falls back to mocks | Start the API and add an explicit offline banner |
| Port already in use | Another dev server or API process is running | Stop the old process or change the port in the service config |
| Frontends not running | Only the API was started | Run `npm run dev` or the individual `dev:*` command |

---

## 9. Known gaps

- No real authentication, session, JWT verification, RBAC or audit log.
- No Vault Transit integration; no phone encryption code in this repo.
- No FHIR adapter or FHIR resources.
- No WebRTC in Meet; the room is a placeholder.
- No Medprom directory, search, profiles, promotions or leads.
- No prescription API or UI; only the `encrypted_blob` column exists.
- No RLS; isolation is application-level only, and the API hardcodes `DEMO`.
- No structured logging, request IDs, log rotation or redaction.
- No rate limiting, CORS allowlist or security headers.
- No automated tests; only TypeScript checks.
- No RC service.
