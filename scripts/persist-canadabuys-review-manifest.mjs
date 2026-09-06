import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createAdminDatabaseRpcClient } from "../dist/packages/database/admin.js";
import { persistCanadaBuysReviewCandidate } from "../dist/packages/signal-ingestion/index.js";

const manifestPath = resolve(process.argv[2] ?? "/tmp/canadabuys-dry-run-manifest.json");
const resultPath = resolve(process.argv[3] ?? "/tmp/canadabuys-review-persist-result.json");
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for CanadaBuys review persistence");
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (!Number.isInteger(manifest.cap) || manifest.cap < 20 || manifest.cap > 50) {
  throw new Error("Manifest must have an approved 20–50 record cap");
}
if (!Array.isArray(manifest.reviewCandidates) || !Array.isArray(manifest.held)) {
  throw new Error("Manifest does not have the expected dry-run shape");
}
if (manifest.reviewCandidates.length + manifest.held.length > manifest.cap) {
  throw new Error("Manifest exceeds its approved record cap");
}

const client = createAdminDatabaseRpcClient({ supabaseUrl, serviceRoleKey });
const outcomes = [];
for (const candidate of manifest.reviewCandidates) {
  const outcome = await persistCanadaBuysReviewCandidate(client, candidate);
  outcomes.push({ externalReference: candidate.externalReference, reviewItemId: outcome.reviewItemId });
}

const result = {
  cap: manifest.cap,
  inspected: manifest.inspected,
  persistedReviewCandidateCount: outcomes.length,
  heldCount: manifest.held.length,
  outcomes,
};
await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  persistedReviewCandidateCount: outcomes.length,
  heldCount: manifest.held.length,
  resultPath,
}, null, 2));
