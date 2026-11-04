# SOVEREIGN — main repo (~/Desktop/sovereign)

Clinic system. Test patient only: Test Test, 1990-01-01. No real patients.

## Map

| Path | What |
|---|---|
| `apps/clinic` | Clinic app, Vite+React, port **5175**, mock login `doctor / test123` |
| `apps/meet` | Meet app, Vite+React, port **5176**, mock login `doctor / test123` |
| `apps/medprom` | Medprom app, Vite+React, port **5177**, mock login `doctor / test123` |
| `packages/async-engine` | In-memory job queue + router + night window 23:00-06:00 |
| `packages/ui` | Empty, reserved for shared components |
| `src/data/mockData.ts` | Mock code files, models, providers |
| `src/services/sqliteWasm.ts` | Browser-local SQLite (sql.js), cache only |
| `docs-POSTGRES-PLAN.md` | Postgres plan — PLAN ONLY, no code changed |

## Run

```bash
npm install          # root (turbo)
npm run dev          # all 3 apps: 5175 + 5176 + 5177
npm run dev:clinic   # clinic only
npm run dev:meet     # meet only
npm run dev:medprom  # medprom only
npm run build        # build all
```

Async-engine check:

```bash
npm run check --workspace @sovereign/async-engine
```

## Rules

- Heavy jobs ONLY 23:00-06:00. Day = clinic only.
- Every clinic isolated by `clinic_code`. No cross-clinic leaks.
- Prescriptions encrypted. Never log patient name/dose in plain text.
- Secrets in Vault/env only. `.env` never committed.
- No real patients. Test patient: Test Test, 1990-01-01.
