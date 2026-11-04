// SOVEREIGN API — Postgres main. Serves clinic app data.
// Login: demo only (doctor/test123 + DEMO clinic). Real auth = later task.
import express from 'express';
import { checkDb, listPatients, listAppointments, createAppointment } from '@sovereign/db/dist/index.js';

const app = express();
app.use(express.json());

const PORT = Number(process.env.API_PORT || 3001);
const DEMO_CLINIC = 'DEMO';

app.get('/health', async (req, res) => {
  const db = await checkDb();
  res.json({ ok: true, db });
});

app.post('/api/login', (req, res) => {
  const { login, password } = req.body || {};
  if (login === 'doctor' && password === 'test123') {
    return res.json({ ok: true, clinicCode: DEMO_CLINIC, user: login });
  }
  return res.status(401).json({ ok: false, error: 'wrong login or password' });
});

app.get('/api/patients', async (req, res) => {
  try {
    res.json({ ok: true, source: 'postgres', data: await listPatients(DEMO_CLINIC) });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.get('/api/appointments', async (req, res) => {
  try {
    res.json({ ok: true, source: 'postgres', data: await listAppointments(DEMO_CLINIC) });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post('/api/appointments', async (req, res) => {
  const { patientId, startsAt, note } = req.body || {};
  if (!patientId || !startsAt) return res.status(400).json({ ok: false, error: 'patientId + startsAt required' });
  try {
    const row = await createAppointment(DEMO_CLINIC, patientId, startsAt, note || '');
    res.json({ ok: true, source: 'postgres', data: row });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.listen(PORT, () => console.log('SOVEREIGN API on :' + PORT));
