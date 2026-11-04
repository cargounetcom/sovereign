# IDEAS — what to take from Medprom and what not to take

This is a product and engineering idea list, not a commitment. The Medprom source is not available as a real implementation: the linked `clinic-sovereing` repo mentions Medprom in its README only, and the current `apps/medprom` is a login-only mock. Treat every Medprom item below as a hypothesis to validate with users before building.

---

## 1. What to take from Medprom

### Priority table

| Idea | Why it matters | Effort | Priority |
| --- | --- | --- | --- |
| Public clinic / doctor directory | Gives Medprom a reason to exist and brings organic traffic | M | P1 |
| Specialty and location filters | Makes the directory usable in BE / CH / IL | M | P1 |
| Doctor and clinic profiles | Converts visitors into contacts or bookings | M | P1 |
| Appointment request from a profile | Connects promotion to the clinic workflow | M | P1 |
| Verified profile badges | Reduces fake listings and builds trust | S | P1 |
| Admin moderation queue | Keeps listings accurate and compliant | M | P1 |
| Multilingual UI (EN / HE / DE / FR / NL) | Required for the target countries | M | P2 |
| SEO-friendly public pages | Directory traffic depends on search | M | P2 |
| Lead / contact inbox | Lets promoters and clinics respond | M | P2 |
| Reviews with verification | Useful only if abuse is controlled | L | P2 |
| Notifications (email / in-app) | Keeps leads and bookings moving | M | P2 |
| Analytics for promoters | Shows value without exposing patient data | M | P2 |
| Subscription plans | Monetization path | L | P3 |

### What specifically to take

1. **Directory-first product model** — Medprom's strongest idea is a public, searchable layer for clinics and doctors. It is separate from the clinical record and can be built without exposing patient data.
2. **Profile as a landing page** — each doctor or clinic gets a public profile with specialty, languages, location, opening hours and a contact or booking action.
3. **Verified identity** — require a clinic code or professional registration before a profile is published. This fits the existing `clinic_code` model.
4. **Booking handoff** — a Medprom profile can create an appointment request through the existing appointments API, but only after a real auth and consent flow exists.
5. **Moderation** — a simple approve / reject / suspend workflow is more important than a rich CMS.
6. **Multilingual content** — the legacy landing page already has EN, HE, DE, FR and NL. Reuse the idea, not the code.
7. **Public SEO pages** — server-rendered or statically generated profile pages; the current Vite SPA is not ideal for this.
8. **Consent-aware analytics** — measure views and leads, never patient data or clinical searches.

### What to take from the legacy `clinic-sovereing` repo

These are real functions in the linked repo, not Medprom functions:

| Legacy idea | What to reuse | What to change |
| --- | --- | --- |
| Vault Transit encryption | Encrypt phone/PII before storage; keep ciphertext out of plaintext columns | Remove hardcoded Vault token; use a real Vault auth method |
| FHIR patient bridge | Map a patient to a FHIR `Patient` resource | Add validation, retries, error handling and tests |
| Separate PII vault table | Keep PII in a dedicated table with restricted access | Use the current schema and a proper migration |
| PII access log | Record who accessed PII, when and why | Add actor identity, request ID and retention |
| RLS clinic isolation | Enforce `clinic_code` at the database layer | Replace the example policy with a tested policy per role |
| Multi-language landing | Reuse the language set and the idea of a public entry page | Rebuild in the current stack; do not copy the inline HTML |
| Health endpoint | Keep a simple health check | Return non-200 when the database is down |
| Docker Compose | Local reproducibility | Remove default secrets and bind only to localhost |

---

## 2. What NOT to take from Medprom

| Do not take | Why | What to do instead |
| --- | --- | --- |
| Ad-driven ranking of doctors | Turns clinical trust into a pay-to-win list | Rank by relevance, verification and availability; label sponsored results clearly |
| Selling or sharing patient data | Illegal or high-risk under GDPR / nDSG / HIPAA expectations | Never monetize patient data; aggregate only with consent |
| Third-party trackers on clinical pages | Leaks behavior and identifiers | Self-host analytics or use consent-gated, privacy-preserving metrics |
| Cloud-only storage with no exit | Breaks the sovereign promise | Self-hosted Postgres + encrypted backups + export |
| Dark patterns in consent | Invalidates consent and damages trust | Plain-language, granular, revocable consent |
| Fake or unverified reviews | Misleads patients and creates liability | Verified reviews only; moderation and appeal path |
| Unverified medical claims | Regulatory and safety risk | Require evidence and review; no diagnosis or treatment claims |
| A heavy CMS | Slows delivery and adds attack surface | Start with structured profile tables and a small admin UI |
| Patient-visible advertising | Confuses clinical and commercial content | Keep promotion outside the clinical record; label it |
| Vendor lock-in for FHIR / Vault | Contradicts sovereignty | Use open standards and a self-hosted Vault / FHIR adapter |
| Collecting PII "just in case" | Increases breach impact | Data minimization; collect only what the feature needs |

### What NOT to take from the legacy repo

| Do not copy | Why | Evidence |
| --- | --- | --- |
| Hardcoded database passwords | Anyone with repo access gets the database | See `SECURITY.md` for file/line only |
| Hardcoded Medplum client secrets | Leaks an integration credential | See `SECURITY.md` for file/line only |
| Default Vault root token | Gives full Vault control | See `SECURITY.md` for file/line only |
| Direct `psycopg.connect(...)` with inline credentials | Bypasses configuration and secret management | Replace with `DATABASE_URL` from env / Vault |
| Runtime `CREATE TABLE` in application code | Schema drift and race conditions | Use versioned migrations |
| Plaintext fallback when an external service is down | Can silently store or expose PII | Fail closed; never fall back to plaintext |
| Copying patient names into logs | PII leak | Redact logs; log IDs only |
| Example RLS policy without tests | False sense of isolation | Add tests that prove cross-clinic access fails |
| Unpinned Docker images and dev-mode Vault | Unreproducible and unsafe | Pin versions; use production Vault mode |
| No automated tests | Regressions in clinical flows | Add unit + integration tests before real data |

---

## 3. Suggested roadmap

### P0 — make the foundation safe

1. Create the `sovereign` database and run migrations.
2. Fix `/health` to return 503 when the database is unreachable.
3. Replace the hardcoded demo credential with environment-based demo auth or a real auth flow.
4. Add structured logs with request IDs and redaction.
5. Add rate limiting, security headers and a CORS allowlist.
6. Add tests for clinic isolation and appointment creation.
7. Keep `.env` out of git and backups; rotate secrets if exposure is suspected.

### P1 — make Medprom useful

1. Add `medprom_profiles`, `medprom_specialties` and `medprom_locations` tables.
2. Build a public directory with search and filters.
3. Add profile pages with verification status.
4. Add an appointment request action that reuses the appointments API.
5. Add an admin moderation queue.
6. Add a lead/contact inbox.

### P2 — make it trustworthy and measurable

1. Add multilingual content and SEO pages.
2. Add consent-aware analytics.
3. Add verified reviews with moderation.
4. Add notifications.
5. Add subscription plans only after the directory has real usage.

### P3 — interoperability

1. Add a FHIR adapter with explicit resource mapping and validation.
2. Add Vault Transit encryption for phone/PII and prescriptions.
3. Add RLS and per-request clinic context.
4. Add export and retention controls.

---

## 4. Guardrails for every Medprom feature

- **No patient data in Medprom.** Medprom is a public promotion layer; it must not read clinical records.
- **No clinical advice.** Profiles and promotions must not imply diagnosis or treatment.
- **Consent first.** Any contact or booking action requires clear consent and a privacy notice.
- **Clinic isolation.** Every query is scoped by `clinic_code`; RLS is the target enforcement layer.
- **Verified identity.** A profile is published only after clinic or professional verification.
- **Labeled promotion.** Paid placement, if introduced, must be clearly labeled and must not affect clinical ranking.
- **Data minimization.** Collect only the fields the feature uses.
- **Right to erasure.** Profiles and leads must support deletion and export.
- **Auditability.** Admin actions, verification changes and PII access are logged.
- **No secret reuse.** Do not copy credentials, tokens or connection strings from the legacy repo.

---

## 5. Acceptance criteria for a Medprom MVP

The MVP is ready only when all of these are true:

- A visitor can search the directory by specialty and location.
- A doctor or clinic profile is visible without login.
- A profile can be verified by an admin.
- A visitor can send a contact or appointment request.
- The request is stored with consent and a timestamp.
- The clinic can see the request in its own clinic context.
- No clinical record is reachable from Medprom.
- Cross-clinic access is blocked and tested.
- Logs contain IDs, not patient names or phone numbers.
- The UI works in EN and at least one of HE / DE / FR / NL.
