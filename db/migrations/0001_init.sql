-- SOVEREIGN schema v1 — Postgres main. Never edit an applied migration, add a new one.
-- Test patient only: Test Test, 1990-01-01. Prescriptions stored ENCRYPTED (bytea).

CREATE TABLE IF NOT EXISTS clinics (
  clinic_code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_code TEXT NOT NULL REFERENCES clinics(clinic_code) ON DELETE CASCADE,
  login TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_code, login)
);

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_code TEXT NOT NULL REFERENCES clinics(clinic_code) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  dob DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS patients_clinic_idx ON patients (clinic_code);

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_code TEXT NOT NULL REFERENCES clinics(clinic_code) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS appointments_clinic_idx ON appointments (clinic_code, starts_at);

CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_code TEXT NOT NULL REFERENCES clinics(clinic_code) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  encrypted_blob BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prescriptions_clinic_idx ON prescriptions (clinic_code);

-- Seed: demo clinic + demo doctor (login doctor / test123 hash placeholder) + test patient.
-- Password hash MUST be replaced with a real bcrypt hash before production use.
INSERT INTO clinics (clinic_code, name) VALUES ('DEMO', 'Demo Clinic')
ON CONFLICT (clinic_code) DO NOTHING;

INSERT INTO patients (clinic_code, full_name, dob) VALUES ('DEMO', 'Test Test', '1990-01-01')
ON CONFLICT DO NOTHING;
