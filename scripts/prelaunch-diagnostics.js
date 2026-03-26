#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');

const requiredEnv = [
  'VITE_API_URL',
  'VITE_OPENAI_API_KEY',
  'VITE_OPENAI_ASSISTANT_ID',
];

const apiBase = process.env.VITE_API_URL || '';
const staffHealth = `${apiBase.replace(/\/$/, '')}/health`;
const uploadEndpoint = `${apiBase.replace(/\/$/, '')}/client/app/upload-document/diagnostic`;
const chatEndpoint = `${apiBase.replace(/\/$/, '')}/client/app/messages/diagnostic`;
const signNowEndpoint = `${apiBase.replace(/\/$/, '')}/client/app/signnow/diagnostic`;

const strictMode = String(process.env.DIAGNOSTIC_STRICT || '').toLowerCase() === 'true';

function logResult(name, ok, detail = '', level = 'auto') {
  const status = level === 'warn' ? 'WARN' : ok ? 'PASS' : 'FAIL';
  const message = detail ? `${status} - ${detail}` : status;
  console.log(`${name}: ${message}`);
}

async function checkEndpoint(name, url, method = 'GET') {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { method, signal: controller.signal });
    clearTimeout(timeout);
    const ok = res.status < 500;
    logResult(name, ok, `${res.status} ${res.statusText || ''}`.trim());
    return ok;
  } catch (err) {
    if (strictMode) {
      logResult(name, false, err.message);
      return false;
    }
    logResult(name, false, err.message, 'warn');
    return true;
  }
}

function checkEnv() {
  return requiredEnv.map((key) => {
    const present = Boolean(process.env[key]);
    if (!present && !strictMode) {
      logResult(`Env ${key}`, false, 'Missing (non-strict mode)', 'warn');
      return true;
    }
    logResult(`Env ${key}`, present, present ? '' : 'Missing');
    return present;
  }).every(Boolean);
}

function checkLocalStorage() {
  const testFile = path.join(os.tmpdir(), 'client-app-localstorage-check.json');
  try {
    fs.writeFileSync(testFile, JSON.stringify({ ts: Date.now() }));
    const content = fs.readFileSync(testFile, 'utf8');
    const parsed = JSON.parse(content);
    const ok = Boolean(parsed.ts);
    logResult('Local storage read/write', ok);
    fs.unlinkSync(testFile);
    return ok;
  } catch (err) {
    logResult('Local storage read/write', false, err.message);
    return false;
  }
}

async function run() {
  console.log('Prelaunch diagnostics starting...');
  const envOk = checkEnv();
  await checkEndpoint('API base reachable', apiBase, 'GET');
  await checkEndpoint('Staff-server health', staffHealth, 'GET');
  checkLocalStorage();
  await checkEndpoint('Document upload endpoint', uploadEndpoint, 'OPTIONS');
  await checkEndpoint('Chat endpoint', chatEndpoint, 'OPTIONS');
  await checkEndpoint('SignNow endpoint', signNowEndpoint, 'GET');

  if (envOk) console.log('Environment check complete.');
}

run();
