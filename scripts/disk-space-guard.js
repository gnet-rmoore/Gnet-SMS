#!/usr/bin/env node
/**
 * Disk Space Guardian
 * Fails process if free space < 30%
 * Run: node scripts/disk-space-guard.js
 *
 * Cross-platform: Works with Git Bash (Linux df) on Windows,
 * and natively on Linux/macOS.
 */

const { execSync } = require('child_process');
const fs = require('fs');

const THRESHOLD_PCT = 30; // 30% free minimum

try {
  // Get disk usage using df command (works in Git Bash on Windows,
  // and natively on Linux/macOS)
  const output = execSync('df -h .', { encoding: 'utf8' });
  const lines = output.trim().split('\n');

  // Parse the last line (actual filesystem line)
  const parts = lines[lines.length - 1].split(/\s+/);
  
  // df -h output format: Filesystem Size Used Avail Use% Mounted-on
  // Column indices:      0      1    2    3    4      5
  const total = parts[1];
  const used = parts[2];
  const available = parts[3];
  const usePct = parts[4]; // e.g., "37%" or "37" (df -h columns: 0=Filesystem,1=Size,2=Used,3=Avail,4=Use%,5=Mounted-on)
  
  const usePercentage = parseInt(usePct.replace('%', ''), 10);
  const freePercentage = 100 - usePercentage;
  
  console.log('========================================');
  console.log(' Disk Space Guardian');
  console.log('========================================');
  console.log(` Total: ${total}`);
  console.log(` Used:  ${used}`);
  console.log(` Avail: ${available}`);
  console.log(` Used%: ${usePct}`);
  console.log(` Free%: ${freePercentage}%`);
  console.log('========================================');
  
  if (freePercentage >= THRESHOLD_PCT) {
    console.log(`✅ OK: ${freePercentage}% free (>= ${THRESHOLD_PCT}% required)`);
    process.exit(0);
  } else {
    console.log(`❌ FAIL: Only ${freePercentage}% free, need at least ${THRESHOLD_PCT}%`);
    console.log('----------------------------------------');
    console.log('Run cleanup (never prunes volumes - that would delete PostgreSQL data):');
    console.log('  docker image prune -f');
    console.log('  docker builder prune -f');
    console.log('  bash scripts/cleanup-production.sh   # on the server');
    console.log('----------------------------------------');
    process.exit(1);
  }
} catch (error) {
  console.error('Error checking disk space:', error.message);
  process.exit(1);
}