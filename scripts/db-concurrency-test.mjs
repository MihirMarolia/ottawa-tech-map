import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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
    throw new Error(
      `Expected one local Supabase database container, found ${containers.length}`,
    );
  }
  return containers[0];
}

const container = await findDatabaseContainer();
const companyId = "10000000-0000-0000-0000-000000000001";
const runId = "10000000-0000-0000-0000-000000000002";
const canonicalInput =
  '{"externalReference":null,"observedDate":"2026-06-30","signalDiscriminator":"buyer:ca-on|professional_services|2026-06-30","signalType":"government_contract_awarded","sourceIdentity":"https://contracts.example/notices/contract-2026-001|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}';
const fingerprint = createHash("sha256")
  .update(canonicalInput, "utf8")
  .digest("hex");

await dockerPsql(
  container,
  `insert into public.companies (id, canonical_name, canonical_domain)
   values ('${companyId}', 'Northstar Civic Systems', 'northstar-civic.example');
   insert into public.ingestion_runs (id, status, started_at, total_items)
   values ('${runId}', 'running', now(), 8);`,
);

const attempts = Array.from({ length: 8 }, (_, index) => {
  const ordinal = index + 1;
  const itemKey = `concurrent-item-${ordinal}`;
  const correlationId = `20000000-0000-0000-0000-${String(ordinal).padStart(12, "0")}`;
  const sql = `
    select outcome
    from public.persist_government_contract_item(
      '${runId}',
      '${itemKey}',
      '${correlationId}',
      '${companyId}',
      'Canadian Public Procurement Fixture',
      'https://contracts.example/notices/contract-2026-001',
      'https://contracts.example/notices/contract-2026-001',
      '${"a".repeat(64)}',
      '2026-06-30',
      null,
      'buyer:ca-on|professional_services|2026-06-30',
      1,
      '${canonicalInput}',
      '${fingerprint}',
      '{"contractType":"professional_services","observedAt":"2026-06-30"}'::jsonb,
      0.98,
      'government-contract-signal/v1'
    );`;
  return dockerPsql(container, sql);
});

const outcomes = await Promise.all(attempts);
const created = outcomes.filter((outcome) => outcome === "accepted_created");
const replayed = outcomes.filter(
  (outcome) => outcome === "accepted_already_processed",
);

if (created.length !== 1 || replayed.length !== 7) {
  throw new Error(
    `Expected one created and seven replayed outcomes, received ${JSON.stringify(outcomes)}`,
  );
}

const counts = await dockerPsql(
  container,
  `select concat_ws(
    ',',
    (select count(*) from public.sources),
    (select count(*) from public.signals),
    (select count(*) from public.company_signal_links where valid_to is null),
    (select count(*) from public.ingestion_run_items where ingestion_run_id = '${runId}'),
    (select count(*) from public.audit_events where ingestion_run_id = '${runId}')
  );`,
);

if (counts !== "1,1,1,8,8") {
  throw new Error(
    `Expected Source, Signal, active link, item, and Audit Event counts 1,1,1,8,8; received ${counts}`,
  );
}

process.stdout.write(
  "Concurrent ingestion converged: 1 accepted_created, 7 accepted_already_processed, 1 Source, 1 Signal, 1 active link, 8 outcomes, 8 Audit Events.\n",
);
