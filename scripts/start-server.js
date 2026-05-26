import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const httpServerBin = path.join(projectRoot, 'node_modules', 'http-server', 'bin', 'http-server');

const child = spawn(process.execPath, [httpServerBin, projectRoot, '-c-1', '-p', '8000'], {
  stdio: 'inherit'
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});