# LOGS — analysis and runtime findings

Scope: API, clinic, meet, medprom, Postgres and the migration runner.

No real tokens, passwords, IP addresses or email addresses are copied into this document. File paths are repo-relative where possible.

---

## 1. Evidence reviewed

| Source | What was found |
| --- | --- |
| `/tmp/api-3001.log` | 34 lines, mtime `2026-11-04 18:05:02 UTC`; one module-not-found error followed by recovery |
| npm debug logs (`~/.npm/_logs`) | One `migrate` lifecycle failure at `2026-11-04 17:59 UTC`; no detailed database error in the npm log |
| Live API probes at `2026-11-04 18:41 UTC` | `/health`, `/api/patients`, `/api/appointments`, unknown route and bad login |
| Running ports | API `3001` and Postgres `5432` listening; `5175`, `5176`, `5177` not listening |
| Repo log files | None; `.gitignore` ignores `*.log` |
| Clinic / Meet / Medprom logs | No log files found; Vite dev servers were not running |

---

## 2. Runtime snapshot

| Port | Service | Listening | Notes |
| ---: | --- | --- | --- |
| 3001 | API | Yes | Express process running |
| 5175 | Clinic | No | Vite dev server not running |
| 5176 | Meet | No | Vite dev server not running |
| 5177 | Medprom | No | Vite dev server not running |
| 5432 | Postgres | Yes | PostgreSQL 16 running; database `sovereign` missing |

### Health and latency

| Probe | HTTP | Time | Result |
| --- | ---: | ---: | --- |
| `GET /health` | 200 | 35.6 ms | `ok: true`, `db.ok: false`, `database "sovereign" does not exist` |
| `GET /api/patients` | 500 | 9.9 ms | Same missing-database error |
| `GET /api/appointments` | 500 | 7.5 ms | Same missing-database error |
| `GET /api/nope` | 404 | 3.9 ms | Express default HTML 404 |
| `POST /api/login` with wrong credentials | 401 | 11.4 ms | Expected rejection |

No request took longer than 1 second. There is no evidence of slow requests in the available logs or live probes.

---

## 3. Error table

| Date (UTC) | Service | Error | Reason | What to do |
| --- | --- | --- | --- | --- |
| 2026-11-04 17:59 | DB migration | `Lifecycle script 'migrate' failed` | Database `sovereign` does not exist; the migration runner connects to it before the schema can be applied | Create the role/database, confirm `DATABASE_URL`, run `npm run db:migrate`, verify `SELECT 1` |
| 2026-11-04 18:05 | API | `ERR_MODULE_NOT_FOUND: Cannot find package 'dotenv'` after a `node --watch` restart | The API restarted while workspace dependencies were not resolvable; a later restart recovered | Run `npm install` from the repo root, restart the API, keep `dotenv` in the API dependencies, add a startup retry/health check |
| 2026-11-04 18:41 | API | `GET /api/patients` → 500, `database "sovereign" does not exist` | Missing database | Create the database; add a startup fail-fast or a clear 503 |
| 2026-11-04 18:41 | API | `GET /api/appointments` → 500, same database error | Missing database | Same fix |
| 2026-11-04 18:41 | API | `GET /api/nope` → 404 HTML | No route; Express default handler | Add a JSON 404 handler with a stable error shape |
| 2026-11-04 18:41 | API | `POST /api/login` → 401 for wrong credentials | Expected behavior | Add rate limiting and an audit event; do not log the submitted password |
| 2026-11-04 18:41 | API | `/health` returns HTTP 200 while `db.ok` is false | Health handler always returns 200 | Return 503 when a required dependency is down; keep a separate liveness endpoint |
| 2026-11-04 18:41 | Clinic | No log file | Dev server not running; Vite logs to the terminal only | Add file logging or run under a process manager |
| 2026-11-04 18:41 | Meet | No log file | Dev server not running | Same |
| 2026-11-04 18:41 | Medprom | No log file | Dev server not running | Same |
| 2026-11-04 18:41 | Postgres | No `ECONNREFUSED` | Postgres is listening; the failure is a missing database, not a refused connection | Create the database |
| 2026-11-04 | Clinic | No visible error when the API is offline | `apiPatients` catches the failure and silently returns mock data | Add an explicit offline banner and a client-side log event |

---

## 4. What was not found

- No `ECONNREFUSED` in the available logs.
- No 404 or 500 entries in `/tmp/api-3001.log`; the 404/500 results came from live probes.
- No request IDs, structured fields, log levels or timestamps in the API log.
- No clinic, meet or medprom log files.
- No log rotation or retention configuration.
- No slow-request warning or latency histogram.
- No audit log for login, patient access or appointment changes.

---

## 5. Recommendations

### P0 — fix the failure path

1. Create the `sovereign` database and role; run the migration.
2. Make the API fail fast on startup if `DATABASE_URL` is missing or the database is unreachable.
3. Change `/health` to return `503` when `db.ok` is false.
4. Add an error middleware that returns a stable JSON error shape and never returns `String(err)`.
5. Add a JSON 404 handler.
6. Add structured JSON logs with timestamp, level, service, request ID, method, path, status and duration.
7. Redact tokens, cookies, authorization headers, passwords, patient names, phone numbers and free-text notes.
8. Write logs to a file and rotate them; do not rely on terminal scrollback.
9. Run the API and frontends under a process manager so restarts and crashes are recorded.
10. Add a startup check that verifies the migration table and the expected schema version.

### P1 — make logs useful

1. Add a per-request `request_id` and propagate it to database queries.
2. Log slow queries above an agreed threshold.
3. Add an audit event for login success/failure, patient read, appointment create and admin action.
4. Add a client-side error boundary and an offline indicator.
5. Add alerting for 5xx rate, database down and migration failure.
6. Add a small metrics endpoint or exporter for request count, latency and queue depth.

### P2 — operations

1. Centralize logs and set a retention period.
2. Add dashboards for API latency, error rate and DB health.
3. Add tracing once there is more than one service hop.
4. Document the on-call runbook for database down, migration failure and Vault failure.

---

## 6. Logging policy

### Never log

- Passwords, password hashes, tokens, cookies or authorization headers.
- Full `DATABASE_URL` or any connection string.
- Patient names, dates of birth, phone numbers, addresses or prescription content.
- Full request bodies for login, patient or appointment endpoints.
- Vault tokens or plaintext values before encryption.

### Safe to log

- Request ID, method, path, status code and duration.
- Clinic code (not patient identity).
- Record IDs (UUIDs) where needed for debugging.
- Error class and a sanitized message.
- Migration name and result.
- Job kind, job ID and queue depth.

---

## 7. Current verdict

**API:** running but not usable for data because the database is missing.

**Database:** running but the `sovereign` database does not exist.

**Frontends:** not running; no logs to analyze.

**Log quality:** insufficient for production. The single API log file is useful for the module-not-found incident but has no timestamps, request records or structured fields.

**Next action:** create the database, run the migration, verify `/health` and the data endpoints, then add structured logging and a real health contract.
