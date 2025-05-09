#!/usr/bin/env node

// This is a CommonJS entry point that can be run directly with Node.js
const { spawnSync } = require('child_process');
const path = require('path');

console.log('Starting server with Node.js directly...');

// Try to use Node.js to run index.ts directly with ts-node-esm
const result = spawnSync('npx', ['--no-install', 'tsx', 'server/index.ts'], {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..'),
  env: {
    ...process.env,
    NODE_ENV: 'development'
  }
});

process.exit(result.status || 0);