# SECURITY — secrets, git hygiene and risk checklist

Privacy rule applied to this audit: the contents of the local `.env` are **not documented or reproduced**. Only its existence and its git-ignore status are recorded. Any secret found is reported as **file + line + type** only; no values are reproduced.

---

## 1. Summary

| Check | Evidence | Verdict |
| --- | --- | --- |
| Local `.env` exists | File exists locally; contents not documented | **OK for git; content not assessed** |
| Real `.env` tracked by git | `git ls-files` pattern for `.env` produced no output | **OK** |
| `.env` ignored by git | `.gitignore` line 1 | **OK** |
| `.env.example` tracked | Tracked as the intended template; not reproduced here | **OK** |
| `.env` in git history | History scan found only `.env.example` | **OK** |
| `.gitignore` covers `node_modules`, `dist`, `.env`, logs | Yes | **OK** |
| Tracked build artifacts / dependencies / logs | None | **OK** |
| Key material (`.pem`, `.key`, `.p12`, `.pfx`) | None found | **OK** |
| Hardcoded demo credential in current source | File/line list below | **RISK** |
| Hardcoded provider keys / cloud tokens / private keys in current source | None found | **OK** |
| Database credentials in current source | Read from `DATABASE_URL` only | **OK** |
| Password hashing | `password_hash` column exists; no hashing code | **RISK** |
| Auth / session / RBAC | Not implemented | **RISK** |
| RLS / clinic isolation | `clinic_code` exists; no RLS; API hardcodes `DEMO` | **RISK** |
| Prescription encryption | Schema only; no encryption code | **RISK** |
| Vault Transit | Not implemented in current repo | **RISK / GAP** |
| FHIR | Not implemented in current repo | **GAP** |
| TLS | HTTP only; no TLS configuration | **RISK for production** |
| CORS / security headers / rate limiting | None | **RISK** |
| Error leakage | API returns `String(err)` | **RISK** |
| Structured logs / redaction / rotation | None | **RISK** |
| Health check correctness | Returns 200 while DB is down | **RISK** |
| Dependency audit | Not run | **UNKNOWN** |
| Legacy repo hardcoded secrets | File/line/type list below | **RISK if copied** |

---

## 2. Git and `.env` checks

### 2.1 Is a real `.env` tracked?

```bash
git ls-files | grep -E '(^|/)\.env$'
```

Result: no output. **No real `.env` is tracked.**

```bash
git ls-files | grep .env
```

returns `.env.example` only. This is expected. If a rule says the output must be empty, `.env.example` is a false positive; do **not** delete it. The real requirement is that no `.env` with values is tracked.

### 2.2 Is `.env` ignored?

```bash
git check-ignore -v .env
```

Result: `.gitignore:1:.env`. **OK.**

### 2.3 `.env.example`

`.env.example` is tracked as the intended placeholder template. It is not reproduced in this document. Before publishing or sharing the repo, confirm it contains placeholders only and no real credentials.

### 2.4 Git history

```bash
git log --all --name-only --pretty=format: | sort -u | grep -E '(^|/)\.env'
```

Result: only `.env.example`. **No `.env` file appears in git history.**

### 2.5 Build artifacts, dependencies and logs

```bash
git ls-files | grep -E '(^|/)(dist|node_modules)/|\.log$'
```

Result: no output. **OK.**

### 2.6 Key material

No `.pem`, `.key`, `.p12`, `.pfx`, `.crt` or `.cer` files were found. **OK.**

### 2.7 Not assessed

Per the privacy rule, this audit did not inspect the contents of `.env`, did not classify its values as real or placeholder, and did not audit file permissions. Those checks require a separate authorized review.

---

## 3. Hardcoded demo credential — current repo

The current repo uses a hardcoded demo credential in several places. The value is **not reproduced**. Report only these locations and types:

| File | Line(s) | Type |
| --- | --- | --- |
| `apps/api/src/index.mjs` | 24–28 | Demo username/password comparison in the login handler |
| `apps/clinic/src/api.ts` | 16, 22 | Demo credential in the mock fallback |
| `apps/clinic/src/App.tsx` | 48 | Demo credential hint in the UI |
| `apps/meet/src/App.tsx` | 4 | Demo credential constant |
| `apps/medprom/src/App.tsx` | 4 | Demo credential constant |

**Risk:** if the API is exposed, the hardcoded demo login is an authentication bypass. Replace it with environment-based demo auth or a real authentication flow. Remove the UI hint from production builds.

**Do not** put the demo password in tickets, screenshots, analytics or public docs.

---

## 4. Legacy `clinic-sovereing` repo — findings

The linked legacy repo was cloned read-only for comparison. It contains hardcoded credentials. Only file/line/type are listed; values are not reproduced.

| File | Line(s) | Type |
| --- | --- | --- |
| `clinic_final.py` | 12 | Medplum client secret |
| `clinic_final.py` | 18 | Database password |
| `clinic_secure_vault.py` | 8 | Medplum client secret fallback |
| `clinic_secure_vault.py` | 12 | Vault token |
| `clinic_secure_vault.py` | 17 | Database password |
| `clinic_bridge.py` | 8 | Database password |
| `clinic_bridge_medplum.py` | 7 | Database password |
| `docker-compose.yml` | 26, 28 | Vault root token fallback |
| `init-vault.ps1` | 2–6 | Vault token passed in commands |

**Do not copy these values or patterns into SOVEREIGN.** Assume any credential that ever appeared in the legacy repo is compromised and rotate it if it is still in use. Do not reuse the same names or defaults.

---

## 5. Application security risks

| Area | Current state | Risk | Recommendation |
| --- | --- | --- | --- |
| Authentication | Hardcoded demo login; no token or session | High | Implement password hashing (Argon2id or bcrypt), sessions, rotation and logout |
| Authorization | None; API always uses `DEMO` | High | Add RBAC and per-request clinic context |
| Clinic isolation | `clinic_code` in schema; no RLS | High | Add RLS policies and tests that prove cross-clinic denial |
| Prescriptions | `encrypted_blob` column only | High | Encrypt before insert; never log plaintext; add key rotation |
| Vault Transit | Not implemented | High | Add a Vault client with a non-root auth method; fail closed |
| FHIR | Not implemented | Medium | Add a validated adapter; do not copy the legacy bridge blindly |
| Transport | HTTP on localhost; no TLS config | High for production | Terminate TLS at a reverse proxy; redirect HTTP to HTTPS |
| CORS | No CORS middleware | Medium | Allowlist known frontend origins |
| Security headers | None | Medium | Add CSP, HSTS, `X-Content-Type-Options`, frame and referrer policies |
| Rate limiting | None | High | Limit login and write endpoints; add lockout/backoff |
| Input validation | Minimal required-field checks | Medium | Add schema validation and length limits |
| Error responses | `String(err)` returned to clients | High | Return a stable error code; log details server-side only |
| Logging | `console.log`; no redaction or rotation | High | Structured logs, request IDs, redaction, rotation and retention |
| Health check | 200 while DB is down | Medium | Return 503 when a required dependency is down |
| Secrets handling | `.env` exists locally and is ignored; contents not documented | Medium | Keep it out of git, backups, screenshots and tickets |
| Dependencies | No audit performed | Unknown | Run `npm audit` and add a CI check |
| Tests | Only TypeScript checks | High | Add unit, integration and security tests |
| Node runtime | Node 18.19.1; experimental watch warning | Info | Use a supported LTS and avoid watch mode in production |

---

## 6. What MUST NOT be published

### Never publish

- The local `.env` file or any value from it.
- Any database URL with a username, password or host.
- Any provider API key, Vault token, session token or private key.
- Any real patient data, even in screenshots, logs or test fixtures.
- Patient names, dates of birth, phone numbers, addresses, prescriptions or clinical notes.
- Logs containing stack traces with connection strings, request bodies, cookies or authorization headers.
- Internal hostnames, IP addresses, email addresses, usernames or machine paths.
- `.env.local`, `.env.production`, backups, database dumps or `node_modules`.
- The demo credential in a production context.
- Claims that Vault Transit, FHIR, RC, log control or RLS are delivered when they are not.
- The hardcoded secrets or default Vault token from the legacy `clinic-sovereing` repo.

### Safe to publish after review

- `README.md`, `ARCHITECTURE.md`, `FUNCTIONS.md`, `IDEAS.md`, `TASKS.md`.
- `LOGS.md` and `SECURITY.md` in this sanitized form.
- `.env.example` after confirming it contains placeholders only.
- `db/migrations/*.sql` after confirming no real data or credentials.
- `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`.
- Public UI copy that contains no patient data.

---

## 7. Remediation plan

### P0 — before any shared or deployed environment

1. Confirm `.env` remains ignored and is excluded from backups, screenshots and tickets.
2. Rotate any credential if exposure is suspected; do not reuse legacy-repo credentials.
3. Replace the hardcoded demo credential with environment-based demo auth or a real auth flow.
4. Create the database, run migrations and fix the `/health` status code.
5. Add a secret scanner to CI.
6. Confirm `git log --all --name-only` contains no secret file.
7. Add `.env*` patterns to `.gitignore` while keeping `.env.example` tracked.

### P1 — before real patient data

1. Implement auth, session management and RBAC.
2. Add RLS and cross-clinic tests.
3. Add Vault Transit encryption for phone/PII and prescriptions.
4. Add TLS, CORS allowlist, security headers and rate limiting.
5. Sanitize errors and add structured logs with redaction.
6. Add audit events for login, record access and admin actions.
7. Add backup encryption and retention.

### P2 — ongoing

1. Run `npm audit` and dependency updates on a schedule.
2. Add SAST and secret scanning to CI.
3. Add penetration testing before production.
4. Review logs for PII leakage.
5. Rotate secrets on a defined schedule.

---

## 8. Verification commands

Run from the repo root. These are read-only and do **not** open `.env`.

```bash
# Existence only
test -f .env && echo ".env exists"

# No real .env tracked
git ls-files | grep -E '(^|/)\.env$'

# Ignore rule
git check-ignore -v .env

# Broader pattern (expect .env.example only)
git ls-files | grep .env

# No key material
git ls-files | grep -Ei '\.(pem|key|p12|pfx|crt|cer)$'

# No secret file in history
git log --all --name-only --pretty=format: | sort -u | grep -E '(^|/)\.env'

# No tracked build output, dependencies or logs
git ls-files | grep -E '(^|/)(dist|node_modules)/|\.log$'

# Secret-like references: output file and line only, never the value
grep -RInE --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude='.env' \
  '(password|passwd|secret|token|api[_-]?key|private[_-]?key)' . | cut -d: -f1,2 | sort -u
```

---

## 9. Verdict

**Git hygiene:** good. No real `.env` is tracked, `.env` is ignored, history contains only the example file, and no key material or build artifacts are tracked.

**Current code security:** not production-ready. Authentication, authorization, RLS, encryption, TLS, rate limiting, error sanitization and structured logging are missing.

**Legacy repo:** contains hardcoded credentials and a default Vault token. Treat it as a reference only; do not copy its secrets or its dev-mode configuration.
