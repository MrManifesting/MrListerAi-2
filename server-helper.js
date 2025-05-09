
import { fileURLToPath } from 'url';
import path from 'path';

// Fix for ESM lack of __dirname
export function getDirname() {
  const __filename = fileURLToPath(import.meta.url);
  return path.dirname(__filename);
}

// Get consistent paths regardless of where the script is run from
export function getProjectPaths() {
  const rootDir = process.cwd();
  return {
    root: rootDir,
    dist: path.join(rootDir, 'dist'),
    public: path.join(rootDir, 'dist', 'public'),
    server: path.join(rootDir, 'server'),
    client: path.join(rootDir, 'client')
  };
}
