// Compiles packages/db TS to dist/ (node-compatible ESM) for apps/api.
// tsc is hoisted to workspace root by npm workspaces.
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
execSync(process.execPath + ' ' + tsc + ' src/index.ts --outDir dist --module nodenext --moduleResolution nodenext --target es2020 --skipLibCheck', { cwd: here, stdio: 'inherit' });
console.log('db built to dist/');
