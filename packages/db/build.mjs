// Compiles packages/db TS to dist/ (node-compatible ESM) for apps/api.
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const tsc = join(here, 'node_modules', 'typescript', 'bin', 'tsc');
execSync(process.execPath + ' ' + tsc + ' src/index.ts --outDir dist --module nodenext --moduleResolution nodenext --target es2020 --skipLibCheck', { cwd: here, stdio: 'inherit' });
console.log('db built to dist/');
