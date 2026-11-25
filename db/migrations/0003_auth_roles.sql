-- 0003_auth_roles.sql — TAS16: roles for doctor authentication / RBAC.
--
-- The doctors table already carries login + password_hash (0001). This only
-- adds role/activation fields. NO credentials are seeded here: migration 0001
-- deliberately omits the doctor seed, and a password hash must never live in
-- a migration. Use db/bootstrap-doctor.mjs as the controlled bootstrap step.
--
-- 'system_admin' is intentionally absent: cross-clinic access would require a
-- BYPASSRLS role, which is out of scope for this change.

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'doctor';
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'doctors_role_check') THEN
    ALTER TABLE doctors ADD CONSTRAINT doctors_role_check
      CHECK (role IN ('doctor', 'clinic_admin'));
  END IF;
END $$;
