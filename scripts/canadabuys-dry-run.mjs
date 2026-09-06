import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fetchCanadaBuysDryRunReport } from "../dist/packages/signal-ingestion/index.js";

const cap = Number(process.argv[2] ?? "20");
const outputPath = resolve(process.argv[3] ?? "/tmp/canadabuys-dry-run-manifest.json");

const report = await fetchCanadaBuysDryRunReport({
  cap,
  fetcher: (url) => fetch(url, {
    headers: {
      Accept: "text/csv",
      Range: "bytes=0-4194303",
      "User-Agent": "Proofward-CanadaBuys-Review/0.1 (+https://proofward.example/source-policy)",
    },
  }),
});
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

const heldByReason = report.held.reduce((counts, candidate) => {
  counts[candidate.reason] = (counts[candidate.reason] ?? 0) + 1;
  return counts;
}, {});

console.log(JSON.stringify({
  cap: report.cap,
  inspected: report.inspected,
  reviewCandidateCount: report.reviewCandidates.length,
  heldCount: report.held.length,
  heldByReason,
  outputPath,
}, null, 2));
