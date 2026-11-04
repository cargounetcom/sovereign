-- 0002_rls_clinic.sql — clinic isolation via Row Level Security.
--
-- The application must set a transaction-local clinic context before querying:
--   BEGIN;
--   SELECT set_config('app.clinic_code', $1, true);
--   ... queries ...
--   COMMIT;
--
-- TODO(TAS15): use a non-owner application role in production and add tests
-- that prove cross-clinic reads and writes are denied.

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics FORCE ROW LEVEL SECURITY;

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors FORCE ROW LEVEL SECURITY;

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients FORCE ROW LEVEL SECURITY;

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments FORCE ROW LEVEL SECURITY;

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clinics_clinic_isolation ON clinics;
CREATE POLICY clinics_clinic_isolation ON clinics
  FOR ALL
  USING (clinic_code = current_setting('app.clinic_code', true))
  WITH CHECK (clinic_code = current_setting('app.clinic_code', true));

DROP POLICY IF EXISTS doctors_clinic_isolation ON doctors;
CREATE POLICY doctors_clinic_isolation ON doctors
  FOR ALL
  USING (clinic_code = current_setting('app.clinic_code', true))
  WITH CHECK (clinic_code = current_setting('app.clinic_code', true));

DROP POLICY IF EXISTS patients_clinic_isolation ON patients;
CREATE POLICY patients_clinic_isolation ON patients
  FOR ALL
  USING (clinic_code = current_setting('app.clinic_code', true))
  WITH CHECK (clinic_code = current_setting('app.clinic_code', true));

DROP POLICY IF EXISTS appointments_clinic_isolation ON appointments;
CREATE POLICY appointments_clinic_isolation ON appointments
  FOR ALL
  USING (clinic_code = current_setting('app.clinic_code', true))
  WITH CHECK (clinic_code = current_setting('app.clinic_code', true));

DROP POLICY IF EXISTS prescriptions_clinic_isolation ON prescriptions;
CREATE POLICY prescriptions_clinic_isolation ON prescriptions
  FOR ALL
  USING (clinic_code = current_setting('app.clinic_code', true))
  WITH CHECK (clinic_code = current_setting('app.clinic_code', true));
