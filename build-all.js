#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color utilities for prettier output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

const symbols = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
  arrow: '→',
  star: '★',
  dot: '•',
  rocket: '🚀',
  package: '📦',
  sparkles: '✨'
};

// Get the sets directory
const setsDir = path.join(__dirname, 'set');

// Get all set directories
const sets = fs.readdirSync(setsDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name)
  .filter(name => {
    // Check if the set has a cards.csv file
    const cardsCsvPath = path.join(setsDir, name, 'cards.csv');
    return fs.existsSync(cardsCsvPath);
  })
  .sort();

if (sets.length === 0) {
  console.error(`${colors.red}${symbols.error}${colors.reset} No sets found with cards.csv files`);
  process.exit(1);
}

// Build each set
let successCount = 0;
let failCount = 0;
const failures = [];

for (const setName of sets) {
  console.log(`building ${setName}...`);
  
  try {
    // Step 1: Compile
    try {
      execSync(`node compile.js ${setName}`, {
        cwd: __dirname,
        stdio: 'inherit',
        encoding: 'utf-8'
      });
    } catch (error) {
      failures.push({ setName, step: 'compile', error: error.message });
      failCount++;
      continue;
    }
    
    // Step 2: Generate HTML
    try {
      execSync(`node generate-html.js ${setName}`, {
        cwd: __dirname,
        stdio: 'inherit',
        encoding: 'utf-8'
      });
      successCount++;
    } catch (error) {
      failures.push({ setName, step: 'generate-html', error: error.message });
      failCount++;
    }
  } catch (error) {
    failures.push({ setName, step: 'unknown', error: error.message });
    failCount++;
  }
}

// Summary
if (failures.length > 0) {
  failures.forEach(({ setName, step }) => {
    console.error(`${colors.red}${symbols.error}${colors.reset} ${setName} (${step})`);
  });
  process.exit(1);
}
