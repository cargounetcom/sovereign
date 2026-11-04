// Applies db/migrations/*.sql in version order, records in schema_migrations.
// Usage: DATABASE_URL=... npm run migrate --workspace @sovereign/db
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const dir = join(root, 'db', 'migrations');
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: url });
await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
const applied = new Set((await pool.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
let n = 0;
for (const f of files) {
  if (applied.has(f)) {
    console.log('skip applied ' + f);
    continue;
  }
  const sql = readFileSync(join(dir, f), 'utf8');
  console.log('apply ' + f);
  await pool.query('BEGIN');
  try {
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [f]);
    await pool.query('COMMIT');
    n++;
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('FAILED ' + f + ': ' + String(err));
    process.exitCode = 1;
    break;
  }
}
console.log('applied ' + n + ' migration(s)');
await pool.end();
