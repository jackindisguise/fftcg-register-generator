#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  console.error('No sets found with cards.csv files');
  process.exit(1);
}

console.log(`Found ${sets.length} set(s): ${sets.join(', ')}\n`);

// Build each set
let successCount = 0;
let failCount = 0;
const failures = [];

for (const setName of sets) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing set: ${setName}`);
  console.log('='.repeat(60));
  
  try {
    // Step 1: Compile
    console.log(`\n[1/2] Compiling ${setName}...`);
    try {
      execSync(`node compile.js ${setName}`, {
        cwd: __dirname,
        stdio: 'inherit',
        encoding: 'utf-8'
      });
      console.log(`✓ Compiled ${setName} successfully`);
    } catch (error) {
      console.error(`✗ Failed to compile ${setName}`);
      failures.push({ setName, step: 'compile', error: error.message });
      failCount++;
      continue;
    }
    
    // Step 2: Generate HTML
    console.log(`\n[2/2] Generating HTML for ${setName}...`);
    try {
      execSync(`node generate-html.js ${setName}`, {
        cwd: __dirname,
        stdio: 'inherit',
        encoding: 'utf-8'
      });
      console.log(`✓ Generated HTML for ${setName} successfully`);
      successCount++;
    } catch (error) {
      console.error(`✗ Failed to generate HTML for ${setName}`);
      failures.push({ setName, step: 'generate-html', error: error.message });
      failCount++;
    }
  } catch (error) {
    console.error(`✗ Unexpected error processing ${setName}:`, error.message);
    failures.push({ setName, step: 'unknown', error: error.message });
    failCount++;
  }
}

// Summary
console.log(`\n${'='.repeat(60)}`);
console.log('BUILD SUMMARY');
console.log('='.repeat(60));
console.log(`Total sets: ${sets.length}`);
console.log(`Successful: ${successCount}`);
console.log(`Failed: ${failCount}`);

if (failures.length > 0) {
  console.log(`\nFailures:`);
  failures.forEach(({ setName, step, error }) => {
    console.log(`  - ${setName} (${step}): ${error}`);
  });
  process.exit(1);
} else {
  console.log(`\n✓ All sets built successfully!`);
  process.exit(0);
}
