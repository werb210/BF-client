// v118-google-services
// Resolves the android google-services.json for CI in priority order:
//   1. a real file already present in the repo  -> left untouched
//   2. GOOGLE_SERVICES_JSON env/secret (raw or base64) -> written
//   3. a schema-valid placeholder built from the real applicationId
// The placeholder lets the gradle build verify. Push will not work against
// it - it is a compile gate only, never a runtime credential.
import fs from 'node:fs';
import path from 'node:path';

function findRepoRoot(start) {
  let dir = start;
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

function findAndroidDir() {
  const cwd = process.cwd();
  const root = findRepoRoot(cwd);
  const candidates = [
    cwd,
    path.join(root, 'client-app', 'android'),
    path.join(root, 'android'),
    root,
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'app', 'build.gradle'))) return candidate;
  }
  return null;
}

function readApplicationId(androidDir) {
  let text = '';
  try {
    text = fs.readFileSync(path.join(androidDir, 'app', 'build.gradle'), 'utf8');
  } catch (err) {
    return null;
  }
  const match = text.match(/applicationId\s*=?\s*["']([^"']+)["']/);
  return match ? match[1] : null;
}

function decodeSecret(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  if (value.charAt(0) === '{') return value;
  try {
    const decoded = Buffer.from(value, 'base64').toString('utf8').trim();
    if (decoded.charAt(0) === '{') return decoded;
  } catch (err) {
    return null;
  }
  return null;
}

function placeholderFor(packageName) {
  return JSON.stringify(
    {
      project_info: {
        project_number: '000000000000',
        project_id: 'boreal-ci-placeholder',
        storage_bucket: 'boreal-ci-placeholder.appspot.com',
      },
      client: [
        {
          client_info: {
            mobilesdk_app_id: '1:000000000000:android:0000000000000000000000',
            android_client_info: { package_name: packageName },
          },
          oauth_client: [],
          api_key: [{ current_key: 'AIzaSyBOREALCIPLACEHOLDERKEY00000000000' }],
          services: { appinvite_service: { other_platform_oauth_client: [] } },
        },
      ],
      configuration_version: '1',
    },
    null,
    2,
  );
}

const androidDir = findAndroidDir();
if (!androidDir) {
  console.error('V118 FAIL: could not locate an android dir containing app/build.gradle');
  process.exit(1);
}

const defaultOut = path.join(androidDir, 'app', 'google-services.json');
const out = process.env.GOOGLE_SERVICES_OUT || defaultOut;
const dryRun = Boolean(process.env.GOOGLE_SERVICES_OUT);

const packageName = readApplicationId(androidDir);
if (!packageName) {
  console.error('V118 FAIL: applicationId not found in ' + path.join(androidDir, 'app', 'build.gradle'));
  process.exit(1);
}
console.log('V118 androidDir=' + androidDir + ' applicationId=' + packageName);

if (!dryRun && fs.existsSync(defaultOut)) {
  console.log('V118 real google-services.json already present - leaving it alone');
  process.exit(0);
}

const secret = decodeSecret(process.env.GOOGLE_SERVICES_JSON);
if (secret) {
  let parsed;
  try {
    parsed = JSON.parse(secret);
  } catch (err) {
    console.error('V118 FAIL: GOOGLE_SERVICES_JSON is set but is not valid JSON');
    process.exit(1);
  }
  const names = (parsed.client || [])
    .map((c) => (c.client_info && c.client_info.android_client_info || {}).package_name)
    .filter(Boolean);
  if (names.length && names.indexOf(packageName) < 0) {
    console.error(
      'V118 FAIL: GOOGLE_SERVICES_JSON has package names [' +
        names.join(', ') +
        '] but this app is ' +
        packageName,
    );
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, secret.endsWith('\n') ? secret : secret + '\n', 'utf8');
  console.log('V118 wrote google-services.json from secret: ' + out);
  process.exit(0);
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, placeholderFor(packageName) + '\n', 'utf8');
console.log('V118 wrote PLACEHOLDER google-services.json: ' + out);
console.log('V118 WARNING: this is a build gate only. Firebase push will NOT work.');
console.log('V118 WARNING: set the GOOGLE_SERVICES_JSON secret or commit the real file to enable push.');
