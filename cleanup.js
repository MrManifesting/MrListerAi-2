
// Cleanup script to reduce project size
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);

// Directories to clean
const dirsToClean = [
  'node_modules/.cache',
  'node_modules/.vite',
  '.config',
  'dist',
  'temp',
  'client/dist'
];

// File patterns to remove (temp files, logs, etc.)
const filePatterns = [
  '.DS_Store',
  '*.log',
  '*.tmp',
  '*.temp',
  '*.bak',
  '*.tsbuildinfo'
];

async function getDirectorySize(directory) {
  let size = 0;
  try {
    const files = await readdir(directory, { withFileTypes: true });
    const statPromises = files.map(async (file) => {
      const filePath = path.join(directory, file.name);
      if (file.isDirectory()) {
        return await getDirectorySize(filePath);
      } else {
        try {
          const { size: fileSize } = await stat(filePath);
          return fileSize;
        } catch (e) {
          return 0;
        }
      }
    });
    
    const sizes = await Promise.all(statPromises);
    size = sizes.reduce((acc, s) => acc + s, 0);
  } catch (e) {
    console.error(`Error getting size for ${directory}:`, e.message);
  }
  return size;
}

async function removeFiles(directory, patterns) {
  try {
    const files = await readdir(directory, { withFileTypes: true });
    
    for (const file of files) {
      const filePath = path.join(directory, file.name);
      
      if (file.isDirectory()) {
        await removeFiles(filePath, patterns);
        
        // Check if directory is now empty and remove if it is
        const dirFiles = await readdir(filePath);
        if (dirFiles.length === 0) {
          try {
            await rmdir(filePath);
            console.log(`Removed empty directory: ${filePath}`);
          } catch (e) {
            console.error(`Error removing directory ${filePath}:`, e.message);
          }
        }
      } else {
        // Check if file matches any pattern
        const shouldRemove = patterns.some(pattern => {
          if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace('*', '.*'));
            return regex.test(file.name);
          }
          return file.name === pattern;
        });
        
        if (shouldRemove) {
          try {
            await unlink(filePath);
            console.log(`Removed file: ${filePath}`);
          } catch (e) {
            console.error(`Error removing file ${filePath}:`, e.message);
          }
        }
      }
    }
  } catch (e) {
    console.error(`Error accessing directory ${directory}:`, e.message);
  }
}

async function cleanDirectory(directory) {
  try {
    const beforeSize = await getDirectorySize(directory);
    console.log(`Cleaning directory: ${directory} (${formatSize(beforeSize)} before cleanup)`);
    
    try {
      await removeFiles(directory, filePatterns);
      const afterSize = await getDirectorySize(directory);
      console.log(`Finished cleaning ${directory}: ${formatSize(beforeSize - afterSize)} removed`);
    } catch (e) {
      console.error(`Error cleaning ${directory}:`, e.message);
    }
  } catch (e) {
    console.error(`Error accessing ${directory}:`, e.message);
  }
}

function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

async function run() {
  console.log('Starting cleanup process...');
  
  // Clean specific directories
  for (const dir of dirsToClean) {
    try {
      if (fs.existsSync(dir)) {
        await cleanDirectory(dir);
      }
    } catch (e) {
      console.error(`Error processing directory ${dir}:`, e.message);
    }
  }
  
  // Add specific cleanup tasks
  // Remove node_modules/.cache completely
  try {
    if (fs.existsSync('node_modules/.cache')) {
      console.log('Removing node_modules/.cache...');
      fs.rmSync('node_modules/.cache', { recursive: true, force: true });
      console.log('Removed node_modules/.cache');
    }
  } catch (e) {
    console.error('Error removing cache:', e.message);
  }
  
  console.log('Cleanup process completed!');
}

run().catch(console.error);
import fs from 'fs';
import path from 'path';

// Directories to clean up
const directoriesToClean = [
  'temp',
  '/tmp/app-temp',
  'dist/temp'
];

// Execute cleanup
directoriesToClean.forEach(dir => {
  try {
    if (fs.existsSync(dir)) {
      console.log(`Cleaning directory: ${dir}`);
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        try {
          fs.unlinkSync(filePath);
          console.log(`Deleted: ${filePath}`);
        } catch (err) {
          console.error(`Failed to delete ${filePath}:`, err);
        }
      });
    } else {
      console.log(`Directory doesn't exist, skipping: ${dir}`);
    }
  } catch (err) {
    console.error(`Error processing directory ${dir}:`, err);
  }
});

console.log('Cleanup completed');
