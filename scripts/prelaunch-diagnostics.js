#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');

const requiredEnv = [
  'VITE_API_BASE_URL',
  'VITE_OPENAI_API_KEY',
  'VITE_OPENAI_ASSISTANT_ID',
];

const apiBase = process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || 'https://server.boreal.financial';
const staffHealth = `${apiBase.replace(/\/$/, '')}/health`;
const uploadEndpoint = `${apiBase.replace(/\/$/, '')}/api/client/app/upload-document/diagnostic`;
const chatEndpoint = `${apiBase.replace(/\/$/, '')}/api/client/app/messages/diagnostic`;
const signNowEndpoint = `${apiBase.replace(/\/$/, '')}/api/client/app/signnow/diagnostic`;

function logResult(name, ok, detail = '') {
  const status = ok ? 'PASS' : 'FAIL';
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
    logResult(name, false, err.message);
    return false;
  }
}

function checkEnv() {
  return requiredEnv.map((key) => {
    const present = Boolean(process.env[key]);
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
