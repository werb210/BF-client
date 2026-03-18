#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const packageJsonPath = path.join(rootDir, 'package.json');
const tsconfigPath = path.join(rootDir, 'tsconfig.json');
const distPath = path.join(rootDir, 'dist');

function section(title) {
  console.log(`\n--- ${title} ---`);
}

function runCommand(command, options = {}) {
  const execOptions = {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    ...options,
  };

  try {
    const stdout = execSync(command, execOptions);
    return { success: true, stdout: stdout || '', stderr: '' };
  } catch (error) {
    return {
      success: false,
      stdout: error.stdout ? String(error.stdout) : '',
      stderr: error.stderr ? String(error.stderr) : error.message,
      error,
    };
  }
}

function readJsonSafe(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getTotalSizeBytes(targetDir) {
  if (!fs.existsSync(targetDir)) return 0;

  const stack = [targetDir];
  let total = 0;

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        total += fs.statSync(fullPath).size;
      }
    }
  }

  return total;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function scoreToRisk(securityScore, qualityScore, dependencyHealth, buildOk) {
  if (!buildOk || securityScore < 40) return 'Critical';
  if (securityScore < 60 || qualityScore < 60 || dependencyHealth < 60) return 'High';
  if (securityScore < 80 || qualityScore < 80 || dependencyHealth < 80) return 'Medium';
  return 'Low';
}

console.log('=== ENTERPRISE REPOSITORY AUDIT ===');

const summary = {
  eslint: { ran: false, success: false, errors: 0, warnings: 0 },
  typecheck: { ran: false, success: false, errors: 0 },
  audit: { ran: false, success: false, critical: 0, high: 0, moderate: 0, low: 0 },
  depcheck: { ran: false, success: false, unused: [], unusedDev: [] },
  madge: { ran: false, success: false, circular: [] },
  build: { ran: false, success: false },
  bundle: { ran: false, success: false, totalSizeBytes: 0 },
};

section('CHECK 1: ESLINT');
summary.eslint.ran = true;
{
  const result = runCommand('npx eslint . -f json');
  const eslintJson = readJsonSafe(result.stdout);

  if (Array.isArray(eslintJson)) {
    for (const fileResult of eslintJson) {
      summary.eslint.errors += fileResult.errorCount || 0;
      summary.eslint.warnings += fileResult.warningCount || 0;
    }
  }

  summary.eslint.success = result.success && summary.eslint.errors === 0;
  console.log(`Errors: ${summary.eslint.errors}`);
  console.log(`Warnings: ${summary.eslint.warnings}`);
  if (!result.success && !Array.isArray(eslintJson)) {
    console.log('Unable to parse ESLint JSON output.');
    if (result.stderr.trim()) console.log(result.stderr.trim());
  }
}

section('CHECK 2: TYPESCRIPT STRICT CHECK');
if (fs.existsSync(tsconfigPath)) {
  summary.typecheck.ran = true;
  const result = runCommand('npx tsc --noEmit');
  const combined = `${result.stdout}\n${result.stderr}`;
  const matches = combined.match(/error TS\d+:/g);
  summary.typecheck.errors = matches ? matches.length : result.success ? 0 : 1;
  summary.typecheck.success = result.success;

  console.log(`TypeScript errors: ${summary.typecheck.errors}`);
  if (!result.success && result.stderr.trim()) {
    console.log(result.stderr.trim());
  }
} else {
  console.log('Skipped: tsconfig.json not found.');
}

section('CHECK 3: VULNERABILITY SCAN');
summary.audit.ran = true;
{
  const result = runCommand('npm audit --json');
  const auditJson = readJsonSafe(result.stdout || result.stderr);

  const vuln = auditJson?.metadata?.vulnerabilities || {};
  summary.audit.critical = vuln.critical || 0;
  summary.audit.high = vuln.high || 0;
  summary.audit.moderate = vuln.moderate || 0;
  summary.audit.low = vuln.low || 0;

  summary.audit.success =
    summary.audit.critical === 0 &&
    summary.audit.high === 0 &&
    summary.audit.moderate === 0 &&
    summary.audit.low === 0;

  console.log(`critical: ${summary.audit.critical}`);
  console.log(`high: ${summary.audit.high}`);
  console.log(`moderate: ${summary.audit.moderate}`);
  console.log(`low: ${summary.audit.low}`);
  if (!auditJson) {
    console.log('Unable to parse npm audit JSON output.');
  }
}

section('CHECK 4: UNUSED DEPENDENCIES');
summary.depcheck.ran = true;
{
  const result = runCommand('npx depcheck --json --ignore-dirs=dist,coverage,node_modules,android,ios --skip-missing=true');
  const depcheckJson = readJsonSafe(result.stdout);

  if (depcheckJson) {
    summary.depcheck.unused = depcheckJson.dependencies || [];
    summary.depcheck.unusedDev = depcheckJson.devDependencies || [];
    summary.depcheck.success = true;
  }

  console.log('Unused dependencies (advisory):');
  console.log(summary.depcheck.unused.length ? `- ${summary.depcheck.unused.join('\n- ')}` : '- None');
  console.log('Unused devDependencies (advisory):');
  console.log(summary.depcheck.unusedDev.length ? `- ${summary.depcheck.unusedDev.join('\n- ')}` : '- None');

  if (!result.success && !depcheckJson && result.stderr.trim()) {
    console.log(result.stderr.trim());
  }
}

section('CHECK 5: CIRCULAR DEPENDENCIES');
summary.madge.ran = true;
{
  const result = runCommand('npx madge --circular --extensions ts,tsx,js,jsx --json src');
  const madgeJson = readJsonSafe(result.stdout);

  if (Array.isArray(madgeJson)) {
    summary.madge.circular = madgeJson;
  } else if (madgeJson && typeof madgeJson === 'object') {
    summary.madge.circular = Object.entries(madgeJson)
      .filter(([, deps]) => Array.isArray(deps) && deps.length > 0)
      .map(([file, deps]) => [file, ...deps]);
  }

  summary.madge.success = summary.madge.circular.length === 0;
  if (summary.madge.circular.length === 0) {
    console.log('No circular dependencies detected.');
  } else {
    console.log('Circular dependency chains:');
    for (const chain of summary.madge.circular) {
      console.log(`- ${Array.isArray(chain) ? chain.join(' -> ') : String(chain)}`);
    }
  }

  if (!result.success && !madgeJson && result.stderr.trim()) {
    console.log(result.stderr.trim());
  }
}

section('CHECK 6: BUILD VERIFICATION');
{
  const packageJson = readJsonSafe(fs.readFileSync(packageJsonPath, 'utf8')) || {};
  const buildScript = packageJson.scripts && packageJson.scripts.build;

  if (buildScript) {
    summary.build.ran = true;
    const result = runCommand('npm run build');
    summary.build.success = result.success;
    console.log(summary.build.success ? 'Build succeeded.' : 'Build failed.');
    if (!result.success && result.stderr.trim()) {
      console.log(result.stderr.trim());
    }
  } else {
    console.log('Skipped: build script not found in package.json.');
  }
}

section('CHECK 7: BUNDLE SIZE (if Vite detected)');
{
  const viteDetected = fs.existsSync(path.join(rootDir, 'vite.config.js')) ||
    fs.existsSync(path.join(rootDir, 'vite.config.ts'));

  if (viteDetected) {
    summary.bundle.ran = true;
    const result = runCommand('npx vite build --mode production');
    summary.bundle.success = result.success;
    summary.bundle.totalSizeBytes = getTotalSizeBytes(distPath);

    console.log(`Bundle build ${summary.bundle.success ? 'succeeded' : 'failed'}.`);
    console.log(`Total dist size: ${formatBytes(summary.bundle.totalSizeBytes)}`);
    if (!result.success && result.stderr.trim()) {
      console.log(result.stderr.trim());
    }
  } else {
    console.log('Skipped: Vite config not detected.');
  }
}

const securityScore = Math.max(
  0,
  100 - (summary.audit.critical * 40 + summary.audit.high * 20 + summary.audit.moderate * 10 + summary.audit.low * 3)
);

const qualityPenalties = summary.eslint.errors * 4 + summary.eslint.warnings + summary.typecheck.errors * 5;
const codeQualityScore = Math.max(0, 100 - qualityPenalties);

const dependencyHealth = Math.max(
  0,
  100 - (summary.madge.circular.length * 10)
);

const buildStatus = summary.build.ran ? (summary.build.success ? 'PASS' : 'FAIL') : 'SKIPPED';
const overallRisk = scoreToRisk(securityScore, codeQualityScore, dependencyHealth, summary.build.success || !summary.build.ran);

section('FINAL SUMMARY');
console.log(`Security Score: ${securityScore}/100`);
console.log(`Code Quality Score: ${codeQualityScore}/100`);
console.log(`Dependency Health: ${dependencyHealth}/100`);
console.log(`Build Status: ${buildStatus}`);
console.log(`Overall Risk Level: ${overallRisk}`);
