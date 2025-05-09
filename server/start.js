// This is a wrapper script to help with path resolution issues
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

// Get proper __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set environment variables to help with path resolution
process.env.PROJECT_ROOT = path.resolve(__dirname, '..');

// Start the actual server process
console.log('Starting server with PROJECT_ROOT set to:', process.env.PROJECT_ROOT);
const serverProcess = spawn('node', ['--experimental-specifier-resolution=node', '--loader', 'tsx', 'index.ts'], {
  stdio: 'inherit',
  cwd: __dirname,
  env: process.env
});

serverProcess.on('exit', (code) => {
  process.exit(code);
});

// Handle signals properly
['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    serverProcess.kill(signal);
  });
});