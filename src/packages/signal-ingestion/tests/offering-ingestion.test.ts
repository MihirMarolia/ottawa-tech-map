import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "../../database/index.js";
import { createExactCanonicalDomainEntityResolver } from "../../entity-resolver/index.js";
import { createOfferingIngestionService } from "../index.js";

type RpcCall = { name: string; args: Record<string, unknown> };

function createRpcClient(responseByName: Record<string, unknown>, calls: RpcCall[]): SupabaseClient {
  return {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return { data: responseByName[name], error: null };
    },
  } as unknown as SupabaseClient;
}

describe("offering proposal ingestion", () => {
  it("creates an offering proposal through the dedicated RPC and preserves source identity inputs", async () => {
    const calls: RpcCall[] = [];
    const client = createRpcClient({
      create_ingestion_run: "run-1",
      propose_offering_signal: [{
        outcome: "created",
        proposal_id: "proposal-1",
        source_id: "source-1",
        signal_id: "signal-1",
      }],
    }, calls);
    const resolver = createExactCanonicalDomainEntityResolver([{
      id: "company-1" as never,
      canonicalName: "Example Systems",
      canonicalDomain: "example.ca",
      jurisdiction: "CA-ON",
    }]);
    const service = createOfferingIngestionService(client, resolver);

    const outcome = await service.propose({
      companyDomain: "example.ca",
      kind: "product",
      name: "Civic Data Platform",
      description: "Supported by a primary source.",
      sourceName: "Example product page",
      sourceUrl: "https://example.ca/products/civic-data-platform#overview",
      observedAt: "2026-08-16",
      evidenceType: "official_product_page",
      confidence: 0.99,
    });

    expect(outcome).toMatchObject({ status: "accepted", disposition: "created", proposalId: "proposal-1" });
    expect(calls.map((call) => call.name)).toEqual(["create_ingestion_run", "propose_offering_signal"]);
    expect(calls[1]?.args).toMatchObject({
      candidate_company_id: "company-1",
      candidate_kind: "product",
      candidate_signal_type: "product_added",
      candidate_schema_version: "offering-signal/v1",
      candidate_evidence_type: "official_product_page",
      candidate_normalized_url: "https://example.ca/products/civic-data-platform",
    });
  });

  it("routes an unknown company to a persisted company-not-found review item", async () => {
    const calls: RpcCall[] = [];
    const client = createRpcClient({
      create_ingestion_run: "run-review-1",
      persist_offering_company_not_found_review: [{ review_item_id: "review-item-1" }],
    }, calls);
    const resolver = createExactCanonicalDomainEntityResolver([]);
    const service = createOfferingIngestionService(client, resolver);

    const outcome = await service.propose({
      companyName: "Unknown Systems",
      companyDomain: "unknown.example",
      kind: "service",
      name: "Advisory",
      sourceName: "Official company page",
      sourceUrl: "https://unknown.example/services",
      observedAt: "2026-08-16",
      evidenceType: "official_service_page",
      confidence: 0.8,
    });

    expect(outcome).toMatchObject({ status: "review_required", reason: "company_not_found", reviewItemId: "review-item-1" });
    expect(calls.map((call) => call.name)).toEqual(["create_ingestion_run", "persist_offering_company_not_found_review"]);
    expect(calls[1]?.args).toMatchObject({
      candidate_company_name: "Unknown Systems",
      candidate_company_domain: "unknown.example",
      candidate_review_deduplication_key: "offering-review:unknown.example:service:advisory",
    });
  });

  it("supports explicit product change signals without inferring discontinuation", async () => {
    const calls: RpcCall[] = [];
    const client = createRpcClient({
      create_ingestion_run: "run-2",
      propose_offering_signal: [{ outcome: "created", proposal_id: "proposal-2", source_id: "source-2", signal_id: "signal-2" }],
    }, calls);
    const resolver = createExactCanonicalDomainEntityResolver([{
      id: "company-1" as never,
      canonicalName: "Example Systems",
      canonicalDomain: "example.ca",
      jurisdiction: "CA-ON",
    }]);
    const service = createOfferingIngestionService(client, resolver);

    await service.propose({
      companyDomain: "example.ca",
      kind: "product",
      name: "Civic Data Platform",
      sourceName: "Official documentation",
      sourceUrl: "https://example.ca/docs/product",
      observedAt: "2026-08-17",
      evidenceType: "official_documentation",
      confidence: 0.95,
      signalType: "product_changed",
    });

    expect(calls[1]?.args).toMatchObject({ candidate_signal_type: "product_changed" });
  });

  it("keeps approval, rejection, and apply as explicit RPC calls", async () => {
    const calls: RpcCall[] = [];
    const client = createRpcClient({
      approve_offering_proposal: "approved",
      reject_offering_proposal: "rejected",
      apply_offering_proposal: [{ offering_id: "offering-1", status: "applied" }],
    }, calls);
    const resolver = createExactCanonicalDomainEntityResolver([]);
    const service = createOfferingIngestionService(client, resolver);

    await expect(service.approve({ proposalId: "proposal-1", actorIdentifier: "reviewer-1" })).resolves.toBe("approved");
    await expect(service.reject({ proposalId: "proposal-2", actorIdentifier: "reviewer-1", note: "Insufficient primary evidence" })).resolves.toBe("rejected");
    await expect(service.apply("proposal-1")).resolves.toEqual({ offeringId: "offering-1", status: "applied" });
    expect(calls.map((call) => call.name)).toEqual([
      "approve_offering_proposal",
      "reject_offering_proposal",
      "apply_offering_proposal",
    ]);
  });
});
