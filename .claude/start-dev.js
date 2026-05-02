const { spawn } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const vite = path.resolve(root, '..', '..', 'node_modules', '.bin', 'vite');

const port = process.env.PORT || '5173';

const child = spawn(vite, ['--port', port, '--host'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, cwd: root },
});

child.on('exit', code => process.exit(code ?? 0));
