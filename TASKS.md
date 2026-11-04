# TASKS — Sovereign main

Status: scaffold. No real patients. No real production deployment.

## Status legend

- **DONE** — implemented and checked in the current environment.
- **PARTIAL** — some code exists, but a required piece is missing or unverified.
- **OPEN** — not implemented.
- **BLOCKED** — cannot proceed without an external decision or credential.

---

## DONE

- [x] Decide DB strategy: Postgres main, SQLite WASM fallback/demo only.
- [x] Init sovereign core + clinic + meet + medprom.
- [x] TAS10-1: `.gitignore` + commit `src` mock data and SQLite WASM.
- [x] TAS10-2: clinic app scaffold, Vite + React, mock login, port 5175.
- [x] TAS10-3: Postgres plan document only.
- [x] TAS11: root package + turbo, Meet on 5176, Medprom on 5177.
- [x] TAS12-eng: async-engine queue, router and night window.
- [x] TAS12-db: Postgres schema, API, clinic connection, `.env.example`.
- [x] TAS13: README project map and run instructions.
- [x] TAS13-fix: load root `.env`, build `@sovereign/db`, hoist TypeScript.
- [x] TAS14: documentation set, Medprom comparison, log analysis and security audit.

---

## TAS12 — Postgres main + async engine

### DONE

- [x] `db/migrations/0001_init.sql` defines `clinics`, `doctors`, `patients`, `appointments`, `prescriptions` and `schema_migrations`.
- [x] `clinic_code` is present on every clinical table; indexes exist for clinic lookups.
- [x] `prescriptions.encrypted_blob BYTEA` exists.
- [x] `packages/db` reads `DATABASE_URL` from the environment only.
- [x] API exposes `/health`, `/api/login`, `/api/patients`, `GET /api/appointments` and `POST /api/appointments`.
- [x] Clinic app calls the API and falls back to mocks when the API is offline.
- [x] Async engine implements `enqueue`, `dequeue`, `pendingCount`, `peekAll`, `drain`, `registerHandler`, `routeAll`, `isNightNow`, `canRunHeavy`, `nextNightWindow`.
- [x] Night window is 23:00–06:00.
- [x] `npm run db:check` and `npm run check --workspace @sovereign/async-engine` pass.

### PARTIAL

- [x] Create the `sovereign` database and run `npm run db:migrate` in the current environment. **DONE 2026-11-04: DB created by boss, 0001+0002 applied, RLS enabled.**
- [ ] Seed a demo doctor. The migration comment mentions it, but the seed does not insert one.
- [ ] Verify `GET /api/patients` and `GET /api/appointments` return data, not 500.
- [x] Add RLS policies for clinic isolation. **DONE: `0002_rls_clinic.sql` applied; `withClinic` sets `app.clinic_code`; `x-powered-by` off; DB errors hidden (`unavailable`/`internal_error`).**
- [ ] Add a worker entry point that calls `enqueue` / `routeAll`. Not implemented.
- [ ] Register handlers for `backup`, `report`, `embed`, `cleanup`. Not implemented.
- [ ] Persist the queue. In-memory only; jobs are lost on restart.

### OPEN

- [ ] Real authentication, sessions and RBAC.
- [ ] Prescription encryption and prescription API/UI.
- [ ] Audit log table and event stream.
- [ ] Backup automation and retention policy.

---

## TAS13 — README + run documentation

### DONE

- [x] Project map with `apps/clinic`, `apps/meet`, `apps/medprom`, `apps/api`, `packages/async-engine`, `packages/db`, `db/migrations`.
- [x] Run instructions for root install, migrations, API and frontends.
- [x] Port map: 5175, 5176, 5177, 3001, 5432.
- [x] Demo login documented.
- [x] Postgres plan document retained.
- [x] `.env.example` retained as the placeholder template.

### PARTIAL

- [ ] A local `.env` exists and is ignored by git. Its contents are not documented. Verify it matches `.env.example` before running.
- [ ] The demo login is hardcoded in the API and each frontend. Documented as a risk; not changed.
- [ ] The README previously implied `packages/ui` existed. The current `ARCHITECTURE.md` corrects this.

### OPEN

- [ ] Add a one-command bootstrap script for database creation + migration.
- [ ] Add a production deployment guide with TLS, reverse proxy and process manager.
- [ ] Add screenshots or a short demo recording.
- [ ] Add a troubleshooting section for Vault and FHIR once those exist.

---

## TAS14 — documentation, Medprom comparison, logs, security

### DONE

- [x] `README.md` — English project overview, who it is for, problem, services, ports, run steps, demo login, API endpoints, environment, security rules, troubleshooting, known gaps.
- [x] `ARCHITECTURE.md` — directory layout, services, ports 5175 / 5176 / 5177 / 3001 / 5432, request flows, data schema, current vs target security, async engine, configuration, deployment notes.
- [x] `FUNCTIONS.md` — function inventory by service, Medprom artifacts found, Medprom vs Sovereign table, covered functions, special capabilities, legacy comparison.
- [x] `IDEAS.md` — what to take from Medprom, what not to take, legacy lessons, roadmap, guardrails, MVP acceptance criteria.
- [x] `LOGS.md` — API log analysis, npm/migration failure, live probes, no clinic/meet/medprom log files, recommendations.
- [x] `SECURITY.md` — `.env` tracking check, `.env.example` template review, hardcoded credential locations, key material, gitignore coverage, git history, security risks and publication rules.
- [x] Clone and inspect the linked `clinic-sovereing` repo read-only. It contains no Medprom implementation; only README references.
- [x] Document that Vault Transit, FHIR, RC, log control and RLS are **not implemented** in the current repo.
- [x] Do not copy real tokens, passwords, IPs or emails into docs.

### OPEN

- [ ] Keep `.env` out of git and backups; rotate secrets if exposure is suspected.
- [ ] Replace the hardcoded demo credential with environment-based demo auth or a real auth flow.
- [ ] Add structured logging with request IDs, redaction and rotation.
- [ ] Add automated tests for clinic isolation, appointments and the async engine.
- [ ] Add a security header / CORS / rate-limit baseline.
- [ ] Add a secret scanner to CI.
- [ ] Keep the docs current when Vault, FHIR, RC and Medprom features land.

---

## TODO — next tasks

| ID | Task | Priority | Notes |
| --- | --- | --- | --- |
| TAS15 | Create `sovereign` DB, run migrations, verify `/health` and data endpoints | P0 | DONE 2026-11-04: DB live, 0001+0002 applied, patients endpoint returns Test Test |
| TAS16 | Real auth + RBAC + remove hardcoded demo credential | P0 | Do not deploy without this |
| TAS17 | Structured logging + redaction + retention | P0 | Replace `console.log` |
| TAS18 | Vault Transit for phone/PII and prescriptions | P1 | Use a real auth method, no dev root token |
| TAS19 | Medprom directory MVP (profiles, search, moderation) | P1 | Public layer; no clinical data |
| TAS20 | Meet WebRTC MVP | P2 | Signaling, TURN/STUN, consent |
| TAS21 | FHIR adapter | P2 | Validate resources; do not copy legacy code blindly |
| TAS22 | RLS + per-request clinic context | P1 | Test cross-clinic denial |
| TAS23 | Docker Compose / production deployment | P2 | Pin images; no default secrets |
| TAS24 | Test suite + CI secret scan | P1 | Unit, integration, security checks |

---

## Environment findings from TAS14

| Item | State |
| --- | --- |
| API on 3001 | Running |
| Postgres on 5432 | Running |
| Database `sovereign` | Missing; `/health` reports `db.ok: false` |
| Clinic / Meet / Medprom dev servers | Not running |
| API log file | `/tmp/api-3001.log`, 34 lines, one `ERR_MODULE_NOT_FOUND` then recovery |
| Clinic / Meet / Medprom logs | No log files found |
| TypeScript checks | `db:check` and `async-engine` check pass |
| Git worktree | Clean at the time of analysis |
| `.env` | Present locally; ignored by git; contents not documented |

---

## Notes

- TAS14 changed **documentation only**. No application code, schema, environment file or credential was modified.
- The linked legacy repo is a reference, not a dependency. Do not copy its hardcoded secrets or its dev-mode Vault configuration.
- The current repo is a scaffold. Do not describe Vault, FHIR, RC, log control or RLS as delivered.
