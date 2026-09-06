/**
 * CanadaBuys dry-run boundary: parse a capped official award-notice stream into
 * review candidates only. It neither resolves companies nor creates signals.
 */
import { createHash, randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { parse } from "csv-parse";
import type { AdminDatabaseRpcClient } from "../../database/admin.js";
import type { ReviewQueueItemId } from "../index.js";

export const CANADABUYS_AWARD_NOTICE_RESOURCE_URL =
  "https://canadabuys.canada.ca/opendata/pub/awardNoticeComplete-avisAttributionComplet.csv";
export const CANADABUYS_DRY_RUN_RANGE_HEADER = "bytes=0-4194303";
export const CANADABUYS_DRY_RUN_REQUEST_HEADERS = {
  Accept: "text/csv",
  Range: CANADABUYS_DRY_RUN_RANGE_HEADER,
  "User-Agent": "Proofward-CanadaBuys-Review/0.1 (+https://proofward.example/source-policy)",
} as const;

const SOURCE_NAME = "CanadaBuys award notices";
const SCHEMA_VERSION = "government-contract-signal/v1";
const RESOLVER_VERSION = "canadabuys-supplier-name/v1";
const EXTERNAL_REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;

type AwardNoticeCsvRow = Record<string, string | undefined>;

export type CanadaBuysDryRunHoldReason =
  | "missing_required_field"
  | "invalid_publication_date"
  | "unsupported_award_status"
  | "unsupported_procurement_category"
  | "amendment_requires_review"
  | "invalid_external_reference";

export type CanadaBuysReviewCandidate = {
  status: "review_candidate";
  externalReference: string;
  supplierName: string;
  observedAt: string;
  sourceUrl: string;
  normalizedSourceUrl: string;
  contentHash: string;
  reviewDeduplicationKey: string;
  sanitizedProposal: {
    sourceFamily: "canadabuys_award_notice";
    externalReference: string;
    noticeReference: string;
    amendmentNumber: string;
    awardStatus: "active";
    procurementCategory: "SRV";
    observedAt: string;
    attribution: "Contains information licensed under the Open Government Licence – Canada.";
  };
};

export type CanadaBuysHeldCandidate = {
  status: "held";
  reason: CanadaBuysDryRunHoldReason;
  sourceUrl: string;
  noticeReference: string | null;
};

export type CanadaBuysDryRunCandidate =
  | CanadaBuysReviewCandidate
  | CanadaBuysHeldCandidate;

export type CanadaBuysDryRunReport = {
  cap: number;
  inspected: number;
  reviewCandidates: readonly CanadaBuysReviewCandidate[];
  held: readonly CanadaBuysHeldCandidate[];
};

type FetchResponse = {
  ok: boolean;
  status: number;
  body: ReadableStream<Uint8Array> | null;
};

export type CanadaBuysFetch = (url: string, init?: RequestInit) => Promise<FetchResponse>;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function text(row: AwardNoticeCsvRow, key: string): string {
  return row[key]?.trim() ?? "";
}

function externalReference(row: AwardNoticeCsvRow): string | null {
  const noticeReference = text(row, "referenceNumber-numeroReference");
  const amendmentNumber = text(row, "amendmentNumber-numeroModification") || "0";
  const value = `canadabuys:${noticeReference}:${amendmentNumber}`;
  return EXTERNAL_REFERENCE_PATTERN.test(value) ? value : null;
}

function originalNotice(row: AwardNoticeCsvRow): boolean {
  const amendmentNumber = text(row, "amendmentNumber-numeroModification");
  return amendmentNumber === "" || /^0+$/.test(amendmentNumber);
}

function includesServiceCategory(value: string): boolean {
  return value
    .toUpperCase()
    .split(/\s+/)
    .some((category) => category.replace(/^\*/, "") === "SRV");
}

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function normalizeCanadaBuysAwardNotice(
  row: AwardNoticeCsvRow,
  sourceUrl = CANADABUYS_AWARD_NOTICE_RESOURCE_URL,
): CanadaBuysDryRunCandidate {
  const noticeReference = text(row, "referenceNumber-numeroReference");
  const supplierName = text(row, "supplierLegalName-nomLegalFournisseur-eng");
  const publicationDate = text(row, "publicationDate-datePublication");
  const awardStatus = text(row, "awardStatus-attributionStatut-eng").toLowerCase();
  const procurementCategory = text(row, "procurementCategory-categorieApprovisionnement");

  if (!noticeReference || !supplierName || !publicationDate) {
    return { status: "held", reason: "missing_required_field", sourceUrl, noticeReference: noticeReference || null };
  }
  if (!validDate(publicationDate)) {
    return { status: "held", reason: "invalid_publication_date", sourceUrl, noticeReference };
  }
  if (awardStatus !== "active") {
    return { status: "held", reason: "unsupported_award_status", sourceUrl, noticeReference };
  }
  if (!includesServiceCategory(procurementCategory)) {
    return { status: "held", reason: "unsupported_procurement_category", sourceUrl, noticeReference };
  }
  if (!originalNotice(row)) {
    return { status: "held", reason: "amendment_requires_review", sourceUrl, noticeReference };
  }

  const officialReference = externalReference(row);
  if (!officialReference) {
    return { status: "held", reason: "invalid_external_reference", sourceUrl, noticeReference };
  }

  const amendmentNumber = text(row, "amendmentNumber-numeroModification") || "0";
  const canonicalSourceRecord = JSON.stringify({
    awardStatus: "active",
    externalReference: officialReference,
    noticeReference,
    observedAt: publicationDate,
    procurementCategory: "SRV",
    supplierName,
  });
  const contentHash = sha256(canonicalSourceRecord);

  return {
    status: "review_candidate",
    externalReference: officialReference,
    supplierName,
    observedAt: publicationDate,
    sourceUrl,
    normalizedSourceUrl: sourceUrl,
    contentHash,
    reviewDeduplicationKey: `canadabuys-review:v1:${contentHash}`,
    sanitizedProposal: {
      sourceFamily: "canadabuys_award_notice",
      externalReference: officialReference,
      noticeReference,
      amendmentNumber,
      awardStatus: "active",
      procurementCategory: "SRV",
      observedAt: publicationDate,
      attribution: "Contains information licensed under the Open Government Licence – Canada.",
    },
  };
}

function validateCap(cap: number): void {
  if (!Number.isInteger(cap) || cap < 20 || cap > 50) {
    throw new Error("CanadaBuys dry-run cap must be an integer from 20 through 50");
  }
}

export function createCanadaBuysDryRunReport(
  rows: Iterable<AwardNoticeCsvRow>,
  cap: number,
  sourceUrl = CANADABUYS_AWARD_NOTICE_RESOURCE_URL,
): CanadaBuysDryRunReport {
  validateCap(cap);
  const reviewCandidates: CanadaBuysReviewCandidate[] = [];
  const held: CanadaBuysHeldCandidate[] = [];
  let inspected = 0;

  for (const row of rows) {
    if (inspected >= cap) break;
    inspected += 1;
    const candidate = normalizeCanadaBuysAwardNotice(row, sourceUrl);
    if (candidate.status === "review_candidate") reviewCandidates.push(candidate);
    else held.push(candidate);
  }

  return { cap, inspected, reviewCandidates, held };
}

export async function fetchCanadaBuysDryRunReport(input: {
  cap: number;
  fetcher?: CanadaBuysFetch;
  sourceUrl?: string;
}): Promise<CanadaBuysDryRunReport> {
  validateCap(input.cap);
  const sourceUrl = input.sourceUrl ?? CANADABUYS_AWARD_NOTICE_RESOURCE_URL;
  const fetcher = input.fetcher ?? (globalThis.fetch as CanadaBuysFetch);
  const response = await fetcher(sourceUrl, { headers: CANADABUYS_DRY_RUN_REQUEST_HEADERS });
  if (!response.ok || response.body === null) {
    throw new Error(`CanadaBuys resource request failed (${response.status})`);
  }

  const parser = Readable.fromWeb(response.body as import("node:stream/web").ReadableStream)
    .pipe(parse({
      bom: true,
      columns: true,
      relax_column_count: true,
      skip_empty_lines: true,
      to: input.cap,
    }));
  const rows: AwardNoticeCsvRow[] = [];
  for await (const row of parser) rows.push(row as AwardNoticeCsvRow);
  return createCanadaBuysDryRunReport(rows, input.cap, sourceUrl);
}

export async function persistCanadaBuysReviewCandidate(
  client: AdminDatabaseRpcClient,
  candidate: CanadaBuysReviewCandidate,
): Promise<{ status: "review_required"; reviewItemId: ReviewQueueItemId }> {
  const rows = await client.call<ReadonlyArray<{ review_item_id: string }>>(
    "persist_government_contract_unresolved_review_application_item",
    {
      candidate_ingestion_run_id: randomUUID(),
      candidate_item_key: `canadabuys-review:${candidate.contentHash}`,
      candidate_correlation_id: randomUUID(),
      candidate_source_name: SOURCE_NAME,
      candidate_source_url: candidate.sourceUrl,
      candidate_normalized_url: candidate.normalizedSourceUrl,
      candidate_content_hash: candidate.contentHash,
      candidate_review_deduplication_key: candidate.reviewDeduplicationKey,
      candidate_supplier_name: candidate.supplierName,
      candidate_observed_date: candidate.observedAt,
      candidate_sanitized_proposal: candidate.sanitizedProposal,
      candidate_schema_version: SCHEMA_VERSION,
      candidate_resolver_version: RESOLVER_VERSION,
      candidate_resolver_rationale: "CanadaBuys provides a supplier legal name but no verified canonical company domain; reviewer resolution is required.",
    },
  );
  const reviewItemId = rows[0]?.review_item_id;
  if (!reviewItemId || rows.length !== 1) {
    throw new Error("CanadaBuys review persistence RPC returned no review item");
  }
  return { status: "review_required", reviewItemId: reviewItemId as ReviewQueueItemId };
}
