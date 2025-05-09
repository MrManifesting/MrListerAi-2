
// Cleanup script to reduce project size for deployment
import fs from 'fs';
import path from 'path';

// Directories to clean thoroughly
const dirsToClean = [
  'node_modules/.cache',
  'node_modules/.vite',
  '.config',
  'dist/temp',
  'temp',
  '/tmp/app-temp',
  'client/node_modules/.cache',
  'client/.vite'
];

// Large package directories to target
const largePackageDirs = [
  'node_modules/framer-motion',
  'node_modules/recharts',
  'node_modules/@jridgewell',
  'node_modules/pdfmake',
  'node_modules/sharp',
  'node_modules/openai',
  'node_modules/.cache'
];

// File patterns to remove
const filePatterns = [
  '.DS_Store',
  '*.log',
  '*.tmp',
  '*.temp',
  '*.bak',
  '*.tsbuildinfo',
  'node_modules/**/*.map'
];

console.log('🧹 Starting cleanup process to reduce deployment size...');

// Clean specific directories
dirsToClean.forEach(dir => {
  try {
    if (fs.existsSync(dir)) {
      console.log(`Cleaning directory: ${dir}`);
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`✅ Removed ${dir}`);
    }
  } catch (err) {
    console.error(`❌ Error cleaning ${dir}:`, err.message);
  }
});

// Remove development assets from node_modules
largePackageDirs.forEach(dir => {
  try {
    // Remove test, examples, docs folders to reduce size
    ['test', 'tests', 'example', 'examples', 'doc', 'docs'].forEach(subDir => {
      const targetDir = path.join(dir, subDir);
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
        console.log(`✅ Removed ${targetDir}`);
      }
    });
  } catch (err) {
    console.error(`❌ Error cleaning ${dir}:`, err.message);
  }
});

// Verify .deployignore exists and has proper content
try {
  const deployIgnoreContent = `
# Deployment ignore file
node_modules/.cache/
.git/
.config/
temp/
/tmp/
*.log
*.test.ts
*.test.js
__tests__/
coverage/
.vscode/
.idea/
`;

  fs.writeFileSync('.deployignore', deployIgnoreContent.trim());
  console.log('✅ Updated .deployignore file');
} catch (err) {
  console.error('❌ Error updating .deployignore:', err.message);
}

// Clean node_modules/.cache specifically
try {
  if (fs.existsSync('node_modules/.cache')) {
    fs.rmSync('node_modules/.cache', { recursive: true, force: true });
    console.log('✅ Removed node_modules/.cache');
  }
} catch (err) {
  console.error('❌ Error removing cache:', err.message);
}

console.log('🎉 Cleanup process completed! Deployment size should be reduced.');
