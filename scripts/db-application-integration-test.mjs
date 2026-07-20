import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function findDatabaseContainer() {
  const { stdout } = await execFileAsync("docker", [
    "ps",
    "--filter",
    "name=supabase_db_",
    "--format",
    "{{.Names}}",
  ]);
  const containers = stdout
    .trim()
    .split(/\r?\n/)
    .filter((name) => name.startsWith("supabase_db_"));
  if (containers.length !== 1) {
    throw new Error(`Expected one local Supabase database, found ${containers.length}`);
  }
  return containers[0];
}

async function dockerPsql(container, sql) {
  const { stdout } = await execFileAsync(
    "docker",
    [
      "exec",
      container,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-Atc",
      sql,
    ],
    { maxBuffer: 1024 * 1024 },
  );
  return stdout.trim();
}

const container = await findDatabaseContainer();
await dockerPsql(
  container,
  `insert into public.companies (id, canonical_name, canonical_domain)
   values (
     '60000000-0000-0000-0000-000000000001',
     'Northstar Civic Systems',
     'northstar-civic.example'
   );`,
);

const npxExecutable = process.platform === "win32" ? "npx.cmd" : "npx";
const { stdout: statusOutput } = await execFileAsync(
  npxExecutable,
  ["--yes", "supabase@2.109.1", "status", "-o", "json"],
  {
    maxBuffer: 1024 * 1024,
    shell: process.platform === "win32",
  },
);
const local = JSON.parse(statusOutput);
if (typeof local.API_URL !== "string" || typeof local.SERVICE_ROLE_KEY !== "string") {
  throw new Error("Local Supabase status omitted required integration credentials");
}

const vitestEntry = fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url));
const { stdout: testOutput, stderr: testErrors } = await execFileAsync(
  process.execPath,
  [vitestEntry, "run", "src/application-tests/supabase-government-contract-ingestion.integration.test.ts"],
  {
    env: {
      ...process.env,
      SUPABASE_INTEGRATION_URL: local.API_URL,
      SUPABASE_INTEGRATION_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY,
    },
    maxBuffer: 4 * 1024 * 1024,
  },
);
process.stdout.write(testOutput);
process.stderr.write(testErrors);

const counts = await dockerPsql(
  container,
  `select concat_ws(
    ',',
    (select count(*) from public.sources),
    (select count(*) from public.signals),
    (select count(*) from public.company_signal_links where valid_to is null),
    (select count(*) from public.ingestion_runs),
    (select count(*) from public.ingestion_run_items),
    (select count(*) from public.audit_events),
    (select count(*) from public.ingestion_run_items where outcome = 'failed')
  );`,
);
if (counts !== "1,1,1,3,3,3,1") {
  throw new Error(
    `Expected Source, Signal, link, run, item, Audit Event, and failure counts 1,1,1,3,3,3,1; received ${counts}`,
  );
}

process.stdout.write(
  "Application integration persisted one canonical Source, Signal, and link; replay reused them; technical failure recovery was recorded separately.\n",
);
