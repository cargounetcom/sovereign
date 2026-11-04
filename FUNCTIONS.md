# FUNCTIONS — SOVEREIGN

Function inventory for the current repository, plus a Medprom comparison and a comparison against the linked legacy repository.

---

## 1. Source availability and scope

Two different codebases are relevant:

| Source | What it is | Medprom content |
| --- | --- | --- |
| Current repo (`~/Desktop/sovereign`) | Clinic + Meet + Medprom monorepo with API, Postgres and async engine | `apps/medprom` is a login-only mock scaffold |
| Linked repo (`cargounetcom/clinic-sovereing`) | Legacy SOVEREIN landing page + Python Vault/FHIR bridge + SQL migrations + Docker Compose | **No Medprom code or docs**; only README references to a Medprom service on port 5177 |
| Local audit folder (`clinic-project`) | High-level audit notes for `clinic-sovereing` | No Medprom function list |

The linked repository was cloned read-only through Git because the GitHub web/API endpoints return 404. It contains 20 files. Its actual code is clinic/FHIR/Vault, not Medprom.

**Conclusion:** there is no real Medprom implementation to audit. The comparison below uses:

1. the documented Medprom scope — "medical promotion / directory";
2. the Medprom artifacts that actually exist in the current repo (mock login + placeholder);
3. the real functions in the legacy repository, which are clinic/FHIR/Vault functions, not Medprom functions.

Items that cannot be verified against a running Medprom product are marked **unverified**.

---

## 2. Function inventory — current SOVEREIGN

### 2.1 Clinic — port 5175

| Function | Where | What it does | User | State |
| --- | --- | --- | --- | --- |
| Login | `apps/clinic/src/App.tsx`, `api.ts` | Submits login to `POST /api/login`; accepts hardcoded demo login if the API is offline | Doctor / clinic staff | Partial |
| Patient list | `apps/clinic/src/App.tsx` | Calls `GET /api/patients` and renders name + date of birth | Doctor / clinic staff | Partial |
| Mock fallback | `apps/clinic/src/api.ts` | Returns three mock patients when the API is unreachable | Doctor / clinic staff | Demo only |
| Logout | `apps/clinic/src/App.tsx` | Clears local React state | Doctor / clinic staff | Works |
| Appointments UI | — | No screen calls the appointments API | Doctor / clinic staff | Missing |
| Patient create/edit | — | No UI or API | Clinic staff | Missing |
| Prescription UI | — | No UI or API; only the `encrypted_blob` column exists | Doctor | Missing |
| Search / pagination | — | No search, filter or pagination | Clinic staff | Missing |

### 2.2 Meet — port 5176

| Function | Where | What it does | User | State |
| --- | --- | --- | --- | --- |
| Login | `apps/meet/src/App.tsx` | Hardcoded demo login | Doctor / patient | Mock |
| Room placeholder | `apps/meet/src/App.tsx` | Shows `TEST-ROOM-01` text | Doctor / patient | Mock |
| Logout | `apps/meet/src/App.tsx` | Clears local state | Doctor / patient | Mock |
| Video / WebRTC | — | No media, signaling, TURN/STUN or room lifecycle | Doctor / patient | Missing |
| Chat / screen share / recording | — | Not implemented | Doctor / patient | Missing |
| Scheduling / waiting room / consent | — | Not implemented | Doctor / patient | Missing |

### 2.3 Medprom — port 5177

| Function | Where | What it does | User | State |
| --- | --- | --- | --- | --- |
| Login | `apps/medprom/src/App.tsx` | Hardcoded demo login | Medical promoter / visitor | Mock |
| Promotions placeholder | `apps/medprom/src/App.tsx` | Shows a "promos" heading only | Medical promoter / visitor | Mock |
| Logout | `apps/medprom/src/App.tsx` | Clears local state | Medical promoter / visitor | Mock |
| Directory / search | — | No listings, filters or search | Visitor | Missing |
| Profiles / reviews | — | No doctor, clinic or promoter profiles | Visitor | Missing |
| Leads / contact | — | No inquiry or lead capture | Promoter | Missing |
| Analytics / billing | — | Not implemented | Promoter / operator | Missing |
| DB / API | — | Medprom does not call the API or Postgres | — | Missing |

### 2.4 API — port 3001

| Function | Method / path | What it does | Auth | State |
| --- | --- | --- | --- | --- |
| Health | `GET /health` | Returns process status and database check | None | Works, but HTTP 200 even when DB is down |
| Demo login | `POST /api/login` | Hardcoded credential check; returns `clinicCode: "DEMO"` | None | Demo only |
| List patients | `GET /api/patients` | `SELECT` patients for `DEMO` | None | Works only with DB |
| List appointments | `GET /api/appointments` | Latest 50 appointments for `DEMO` | None | Works only with DB |
| Create appointment | `POST /api/appointments` | Inserts `patientId`, `startsAt`, `note` | None | Works only with DB |
| Unknown route | any | Express default 404 HTML | None | No JSON contract |
| Error handling | — | Returns `String(err)` to the client | — | Leaks internal details |

The API hardcodes `DEMO_CLINIC = 'DEMO'`. There is no token, session, RBAC, rate limit, CORS policy or security-header middleware.

### 2.5 Database — port 5432

| Function | Where | What it does | State |
| --- | --- | --- | --- |
| Migration runner | `packages/db/scripts/migrate.mjs` | Applies `db/migrations/*.sql`, records in `schema_migrations` | Works when DB exists |
| `listPatients` | `packages/db/src/index.ts` | Lists patients by `clinic_code` | Works when DB exists |
| `listAppointments` | `packages/db/src/index.ts` | Lists latest 50 appointments by `clinic_code` | Works when DB exists |
| `createAppointment` | `packages/db/src/index.ts` | Inserts an appointment | Works when DB exists |
| Schema | `db/migrations/0001_init.sql` | `clinics`, `doctors`, `patients`, `appointments`, `prescriptions` | Applied when DB exists |
| RLS | — | No row-level security policies | Missing |
| Audit log | — | No audit table or event stream | Missing |
| Prescription encryption | — | Column exists; no encryption code | Missing |

### 2.6 Async engine — no port

| Function | Where | What it does | State |
| --- | --- | --- | --- |
| `enqueue` | `packages/async-engine/src/queue.ts` | Adds a job to an in-memory FIFO queue | Works in-process |
| `dequeue` | `queue.ts` | Removes the next job | Works |
| `pendingCount` / `peekAll` | `queue.ts` | Inspects the queue | Works |
| `drain` | `queue.ts` | Runs a handler for every queued job | Works |
| `registerHandler` | `router.ts` | Maps a job kind to a handler | Works |
| `routeAll` | `router.ts` | Runs jobs; defers heavy jobs outside the night window | Works |
| `isNightNow` / `canRunHeavy` / `nextNightWindow` | `night_shift.ts` | Implements 23:00–06:00 | Works |
| Job kinds | `types.ts` | `backup`, `report`, `embed`, `cleanup` | Types only |
| Worker process | — | No entry point, persistence, retries or dead-letter queue | Missing |

### 2.7 RC — no service

There is no service, package, route or script named RC. The async engine is the only asynchronous component. RC is a gap, not a delivered feature.

---

## 3. Medprom artifacts that exist in the current repo

| Artifact | Content | Medprom function |
| --- | --- | --- |
| `apps/medprom/src/App.tsx` | Mock login, "promos" heading, logout | Login shell + placeholder |
| `apps/medprom/index.html` | HTML shell, title `Sovereign Medprom` | None |
| `apps/medprom/vite.config.ts` | Vite config, port 5177 | None |
| `apps/medprom/package.json` | React/Vite package `@sovereign/medprom` | None |
| `README.md` | One-line description and port 5177 | None |
| `TASKS.md` | Init and port tasks | None |
| `apps/medprom/dist/` | Built copy of the same mock | Same as source |

There are **no Medprom-specific documents, schema, API routes, database tables, directory data or promotion models** in the current repo.

---

## 4. Medprom artifacts in the linked legacy repo

The linked `clinic-sovereing` repo mentions Medprom in its README only:

| Reference | What it says | Function |
| --- | --- | --- |
| README service table | Medprom, port 5177, "Medical promotion / directory" | Service declaration only |
| README data flow | User → Clinic / Meet / Medprom | Architecture intent only |
| README architecture | Clinic + Meet + Medprom in one system | Intent only |

There is no `medprom` directory, route, component, schema or document in that repo. Its actual code covers a landing page, Medplum FHIR patient creation, Vault Transit encryption, appointments, PII tables, RLS and Docker Compose.

---

## 5. Medprom vs Sovereign — comparison table

Columns requested: **Medprom Function / Do We Have It / Ours Is Better / We Don't Have It**.

| Medprom function / scope | Do we have it? | Ours is better? | We don't have it |
| --- | --- | --- | --- |
| Public Medprom entry page | Partial — mock login page only | Not yet | Public directory landing page |
| Login for promoters / clinics | Partial — hardcoded demo login | No | Real accounts, sessions, password reset |
| Doctor directory | No | No | Searchable doctor list |
| Clinic directory | No | No | Searchable clinic list |
| Specialty / location filters | No | No | Filter and sort |
| Doctor / clinic profiles | No | No | Profile pages, credentials, contacts |
| Medical promotions / offers | Partial — heading only | No | Promotion model, scheduling, moderation |
| Lead / contact form | No | No | Inquiry capture and routing |
| Reviews / ratings | No | No | Verified reviews and moderation |
| Appointment request from Medprom | Partial — appointments API exists in Clinic, not Medprom | Yes, DB-backed API | Medprom booking flow |
| Video consultation link | Partial — Meet mock only | Not yet | Real room link and consent |
| Notifications | No | No | Email/SMS/in-app notifications |
| Analytics dashboard | No | No | Views, leads, conversion |
| Subscription / billing | No | No | Plans, invoices, entitlements |
| Multi-language UI | No | No | BE/CH/IL language coverage |
| Admin moderation | No | No | Approve/reject listings |
| Audit trail | No | No | Who changed what, when |
| FHIR interoperability | No | No | FHIR resources and adapter |
| Vault Transit encryption | No | No | Phone/PII encryption in the current repo |
| Clinic isolation | Partial — `clinic_code` schema, API hardcodes `DEMO` | Partial | RLS and per-request clinic context |
| Own ports | Yes — 5175 / 5176 / 5177 / 3001 | Yes | n/a |
| Own docs | Yes — this documentation set | Yes | n/a |
| Own log control | No | No | Structured logs, retention, redaction |
| Own RC service | No | No | RC service or equivalent |

**Reading the table:** "Ours is better" is only marked **Yes** where the current implementation genuinely provides a stronger foundation. Do not read "Partial" as production-ready.

---

## 6. All Medprom functions we already cover

This is the complete list of Medprom-scope items that the current code touches, even partially:

1. A separate Medprom application shell on port **5177**.
2. A demo login screen for the Medprom user.
3. A placeholder "promos" screen.
4. A logout action.
5. Shared React/Vite/monorepo build tooling.
6. Documentation of the Medprom scope and gaps (this file).

That is the full extent of Medprom coverage. There is **no** directory, search, profile, promotion, lead, review, billing, analytics or moderation function.

---

## 7. What is special in ours that Medprom does not have

| Special capability | Status | Evidence | Medprom has it? |
| --- | --- | --- | --- |
| Clinic + Meet + Medprom in one monorepo | Implemented as shells | `apps/*`, root `package.json`, `turbo.json` | No evidence |
| Explicit ports per service | Implemented | 5175, 5176, 5177, 3001 | No evidence |
| Postgres schema with `clinic_code` on every clinical table | Implemented | `db/migrations/0001_init.sql` | No evidence |
| Encrypted prescription blob design | Schema only | `prescriptions.encrypted_blob BYTEA` | No evidence |
| Async engine with a hard night window | Implemented | `packages/async-engine/src/night_shift.ts` | No evidence |
| Test-only data policy | Implemented | README, schema seed, mock apps | No evidence |
| Secrets kept out of git | Implemented for the current repo | `.gitignore`, `git ls-files` | No evidence |
| Documentation set | Implemented | README, ARCHITECTURE, FUNCTIONS, IDEAS, TASKS, LOGS, SECURITY | No evidence |
| Own RC service | **Not implemented** | No RC code or package | No evidence |
| Own log control | **Not implemented** | `console.log` only | No evidence |
| Vault Transit in the current repo | **Not implemented** | No Vault client or encryption code | Legacy repo has Vault scripts, current does not |
| FHIR in the current repo | **Not implemented** | No FHIR adapter or resources | Legacy repo has partial Medplum calls, current does not |
| RLS / per-request clinic context | **Not implemented** | API hardcodes `DEMO` | No evidence |
| Clinic + Meet integration | **Partial** | Same demo credential; separate apps; no shared session | No evidence |
| Clinic + Medprom integration | **Mock only** | Medprom does not call the API | No evidence |
| Multi-language UI | **Not implemented** | UI strings are hardcoded English | Legacy landing page has 5 locales; current does not |

### Important non-claims

- The current repo does **not** implement Vault Transit, FHIR, RC, log control or RLS.
- The legacy `clinic-sovereing` README claim "SECURE BRIDGE DONE" refers to its Python Vault/Medplum scripts, not to the current SOVEREIGN repo.
- Do not use "Vault Transit done", "FHIR done" or "RC done" in current SOVEREIGN material until the code and tests exist here.

---

## 8. Legacy `clinic-sovereing` functions vs current Sovereign

The linked repo is not Medprom, but its real functions are useful context.

| Legacy function | Where | Current Sovereign status | Gap |
| --- | --- | --- | --- |
| Landing page with EN/HE/DE/FR/NL | `web/index.js` | No landing page | Missing |
| Health endpoint | `web/index.js` | `GET /health` | Equivalent, but current health is misleading when DB is down |
| Vault Transit encrypt / decrypt | `clinic_secure_vault.py` | No Vault code | Missing |
| Medplum FHIR patient create | `clinic_bridge_medplum.py`, `clinic_final.py` | No FHIR code | Missing |
| Medplum OAuth client credentials | `clinic_final.py` | No OAuth client | Missing |
| Appointment insert | `clinic_bridge.py` | `POST /api/appointments` | Partial |
| PII vault table | `migrations/002_pii_vault.sql` | No `patient_pii` table | Missing |
| PII access log | `migrations/002_pii_vault.sql` | No audit table | Missing |
| RLS clinic isolation | `migrations/003_rls_clinic.sql` | No RLS | Missing |
| Docker Compose stack | `docker-compose.yml` | No Dockerfile or Compose file | Missing |
| Railway deploy config | `railway.json` | No deploy config | Missing |
| Medplum config | `medplum.config.json` | No Medplum integration | Missing |

The legacy repo also contains hardcoded credentials and a default Vault token in source. Those are reported by file/line in `SECURITY.md` and must not be copied into SOVEREIGN.

---

## 9. Coverage summary

Approximate, based on the tables above:

| Area | Covered | Partial | Missing |
| --- | ---: | ---: | ---: |
| Medprom scope items | 0 | 3 | 17 |
| Current service functions | 8 | 5 | 12 |
| Legacy clinic/FHIR/Vault functions | 1 | 2 | 9 |
| Special capabilities (implemented) | 7 | 2 | 4 |

These counts are for planning, not marketing. The product is a scaffold.
