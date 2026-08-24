import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "../../database/index.js";
import type {
  EntityResolutionResult,
  EntityResolver,
} from "../../entity-resolver/index.js";
import type {
  OfferingApplyOutcome,
  OfferingProposalDecisionInput,
  OfferingProposalOutcome,
  OfferingProposalService,
  ProductEvidenceInput,
} from "../index.js";
import { normalizeSourceUrl } from "./in-memory-repositories.js";

type RpcProposalRow = {
  outcome: "created" | "already_processed";
  proposal_id: string;
  source_id: string;
  signal_id: string;
};

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function signalTypeFor(input: ProductEvidenceInput): "product_added" | "service_added" | "product_changed" | "service_changed" {
  const defaultType = input.kind === "product" ? "product_added" : "service_added";
  const requestedType = input.signalType ?? defaultType;
  const kindMatches = input.kind === "product"
    ? requestedType === "product_added" || requestedType === "product_changed"
    : requestedType === "service_added" || requestedType === "service_changed";
  if (!kindMatches) {
    throw new Error("Offering signal type does not match offering kind");
  }
  return requestedType;
}

function validInput(input: ProductEvidenceInput): boolean {
  return input.companyDomain.trim() !== ""
    && input.name.trim() !== ""
    && input.sourceName.trim() !== ""
    && input.observedAt.trim() !== ""
    && Number.isFinite(input.confidence)
    && input.confidence >= 0
    && input.confidence <= 1;
}

export class OfferingIngestionService implements OfferingProposalService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly entityResolver: EntityResolver,
  ) {}

  async propose(input: ProductEvidenceInput): Promise<OfferingProposalOutcome> {
    if (!validInput(input)) {
      throw new Error("Invalid offering evidence input");
    }

    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeSourceUrl(input.sourceUrl);
    } catch {
      throw new Error("Invalid offering source URL");
    }

    const signalType = signalTypeFor(input);
    const { data: ingestionRunId, error: ingestionRunError } = await this.client.rpc("create_ingestion_run", { planned_total_items: 1 });
    if (ingestionRunError || !ingestionRunId) {
      throw new Error(`Failed to create offering ingestion run: ${ingestionRunError?.message ?? "no data returned"}`);
    }

    const resolution = await this.entityResolver.resolve({
      observedName: undefined,
      observedDomain: input.companyDomain.toLowerCase().trim(),
      jurisdiction: "CA-ON",
    });
    if (resolution.status !== "resolved") {
      const { data: reviewData, error: reviewError } = await this.client.rpc("persist_offering_company_not_found_review", {
        candidate_ingestion_run_id: ingestionRunId as string,
        candidate_item_key: `offering-review:${input.companyDomain.toLowerCase().trim()}:${input.kind}:${input.name.trim().toLowerCase()}`,
        candidate_correlation_id: randomUUID(),
        candidate_review_deduplication_key: `offering-review:${input.companyDomain.toLowerCase().trim()}:${input.kind}:${input.name.trim().toLowerCase()}`,
        candidate_company_name: input.companyName?.trim() || input.companyDomain.trim(),
        candidate_company_domain: input.companyDomain,
        candidate_signal_type: signalType,
        candidate_observed_date: input.observedAt,
        candidate_schema_version: "offering-signal/v1",
        candidate_sanitized_proposal: {
          kind: input.kind,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          evidenceType: input.evidenceType,
          observedAt: input.observedAt,
          sourceName: input.sourceName.trim(),
          sourceUrl: input.sourceUrl,
        },
        candidate_resolver_version: "exact-domain/v1",
        candidate_resolver_rationale: resolution.status === "new_company" ? "No active company matched the observed canonical domain" : resolution.reason,
      });
      if (reviewError || !reviewData) {
        throw new Error(`Offering review persistence RPC failed: ${reviewError?.message ?? "no data returned"}`);
      }
      const reviewItemId = (reviewData as ReadonlyArray<{ review_item_id: string }>)[0]?.review_item_id;
      if (!reviewItemId) {
        throw new Error("Offering review persistence RPC returned no review item");
      }
      return {
        status: "review_required",
        reviewItemId: reviewItemId as never,
        reason: resolution.status === "new_company" ? "company_not_found" : resolution.reason,
      };
    }


    const description = input.description?.trim() || null;
    const sourceContentHash = sha256(JSON.stringify({
      companyDomain: input.companyDomain.toLowerCase().trim(),
      kind: input.kind,
      name: input.name.trim(),
      description,
      observedAt: input.observedAt,
      evidenceType: input.evidenceType,
    }));
    const signalFingerprintCanonicalInput = JSON.stringify({
      companyId: resolution.companyId,
      description: description ?? "",
      kind: input.kind,
      name: input.name.trim(),
      observedDate: input.observedAt,
      signalType,
      sourceIdentity: `${normalizedUrl}|${sourceContentHash}`,
    });
    const signalFingerprint = sha256(signalFingerprintCanonicalInput);

    const { data, error } = await this.client.rpc("propose_offering_signal", {
      candidate_ingestion_run_id: ingestionRunId as string,
      candidate_item_key: `offering:${signalFingerprint}`,
      candidate_correlation_id: randomUUID(),
      candidate_company_id: resolution.companyId,
      candidate_source_name: input.sourceName.trim(),
      candidate_source_url: input.sourceUrl,
      candidate_normalized_url: normalizedUrl,
      candidate_content_hash: sourceContentHash,
      candidate_observed_date: input.observedAt,
      candidate_kind: input.kind,
      candidate_name: input.name.trim(),
      candidate_description: description,
      candidate_evidence_type: input.evidenceType,
      candidate_signal_type: signalType,
      candidate_signal_fingerprint_version: 1,
      candidate_signal_fingerprint_canonical_input: signalFingerprintCanonicalInput,
      candidate_signal_fingerprint: signalFingerprint,
      candidate_proposal_fingerprint_version: 1,
      candidate_confidence_score: input.confidence,
      candidate_schema_version: "offering-signal/v1",
    });
    if (error || !data) {
      throw new Error(`Offering proposal RPC failed: ${error?.message ?? "no data returned"}`);
    }
    const row = (data as ReadonlyArray<RpcProposalRow>)[0];
    return {
      status: "accepted",
      disposition: row.outcome,
      proposalId: row.proposal_id,
      sourceId: row.source_id as never,
      signalId: row.signal_id as never,
    };
  }

  async approve(input: OfferingProposalDecisionInput): Promise<"approved" | "applied"> {
    const { data, error } = await this.client.rpc("approve_offering_proposal", {
      candidate_proposal_id: input.proposalId,
      candidate_actor_identifier: input.actorIdentifier,
      candidate_note: input.note ?? null,
    });
    if (error) {
      throw new Error(`Offering approval RPC failed: ${error.message}`);
    }
    return data as "approved" | "applied";
  }

  async reject(input: OfferingProposalDecisionInput): Promise<"rejected" | "applied" | "approved"> {
    const { data, error } = await this.client.rpc("reject_offering_proposal", {
      candidate_proposal_id: input.proposalId,
      candidate_actor_identifier: input.actorIdentifier,
      candidate_note: input.note ?? null,
    });
    if (error) {
      throw new Error(`Offering rejection RPC failed: ${error.message}`);
    }
    return data as "rejected" | "applied" | "approved";
  }

  async apply(proposalId: string): Promise<OfferingApplyOutcome> {
    const { data, error } = await this.client.rpc("apply_offering_proposal", {
      candidate_proposal_id: proposalId,
    });
    if (error || !data) {
      throw new Error(`Offering apply RPC failed: ${error?.message ?? "no data returned"}`);
    }
    const row = (data as ReadonlyArray<{ offering_id: string; status: "approved" | "applied" }>)[0];
    return { offeringId: row.offering_id, status: row.status };
  }
}

export function createOfferingIngestionService(
  client: SupabaseClient,
  entityResolver: EntityResolver,
): OfferingIngestionService {
  return new OfferingIngestionService(client, entityResolver);
}

export type { EntityResolutionResult };
