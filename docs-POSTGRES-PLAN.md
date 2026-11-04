# Postgres plan (TAS10-3) — PLAN ONLY, no code changed

## Current state
- App uses mocks only: `src/data/mockData.ts` (INITIAL_CODE_FILES, SANDBOX_MODELS,
  API_PROVIDERS, INITIAL_FINETUNE_DATASET, PARALLEL_PROMPT_PRESETS).
- Local browser data: `src/services/sqliteWasm.ts` (sql.js, tables local_client_notes,
  browser_cache_metrics, opfs_vector_store).
- `.env` has DATABASE_URL key (value not read, not in git).
- No Postgres reachable: port 5432 closed, no psql/pg_isready tools, docker socket denied.
- Rule: test patient only (Test Test, 1990-01-01), clinic_code isolation, encrypt
  prescriptions, secrets only in Vault/env.

## Plan (needs separate task + boss approval before any code change)
1. Decide: Postgres main for server data vs SQLite WASM stays for browser-local cache.
   Proposal: server truth = Postgres; browser = read cache only.
2. Infra: get Postgres access (docker group or server), create `sovereign` DB + app role,
   verify with `SELECT 1`.
3. Schema v1 (new migration, never edit applied): `clinics(clinic_code PK)`,
   `patients(id, clinic_code, name, dob)` with RLS by clinic_code,
   `prescriptions(id, patient_id, encrypted_blob)` — plaintext never logged.
4. App layer: server-side data access only (never direct DB from browser);
   mockData becomes fallback/seed behind a flag.
5. Night jobs: heavy migration/backfill only 23:00-06:00.
6. Test: Test Test 1990-01-01 only, one clinic, verify no cross-clinic leak.

## Not done in TAS10 (by rule)
- No schema created, no mock replaced, no connection attempted with real credentials.
