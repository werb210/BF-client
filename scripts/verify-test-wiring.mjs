// BF_CLIENT_TEST_CI_WIRING_v446
// Every script a workflow invokes must exist, or the step fails for the wrong
// reason - or worse, passes having run nothing. This caught `npm run test:ci`
// in azure-static-web-apps.yml against a package.json that had no such script.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const workflowDir = path.join(root, ".github/workflows");
const problems = [];

for (const file of readdirSync(workflowDir).filter((f) => /\.ya?ml$/.test(f))) {
  const yaml = readFileSync(path.join(workflowDir, file), "utf8");
  // Root-level `npm run <script>` only - a --prefix call targets another package.
  for (const match of yaml.matchAll(/run:\s*npm run ([a-z0-9:_-]+)/g)) {
    const script = match[1];
    if (!pkg.scripts?.[script]) {
      problems.push(`${file}: npm run ${script} — no such script in package.json`);
    }
  }
}

if (problems.length) {
  console.error("Workflow calls a script that does not exist:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`test wiring ok (${Object.keys(pkg.scripts ?? {}).length} scripts)`);
