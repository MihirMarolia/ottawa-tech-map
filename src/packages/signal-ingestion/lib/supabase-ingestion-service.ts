import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "../../database/index.js";
import type { EntityResolver } from "../../entity-resolver/index.js";
import type {
  ExternalReference,
  IngestCorporateSource,
  IngestionOutcome,
  ReviewQueueItemId,
  SignalId,
  SignalIngestionService,
  SourceId,
} from "../index.js";
import {
  canonicalizeSourceDocument,
  parseGovernmentContractSourceDocument,
} from "./source-document.js";
import {
  computeSignalFingerprint,
  governmentContractFingerprintInput,
  SIGNAL_FINGERPRINT_VERSION,
  signalDiscriminatorFor,
} from "./fingerprint.js";
import { normalizeSourceUrl } from "./in-memory-repositories.js";

type RpcResult = {
  outcome: "accepted_created" | "accepted_already_processed";
  source_id: string;
  signal_id: string;
};

class SupabaseGovernmentContractIngestionService
  implements SignalIngestionService
{
  constructor(
    private readonly client: SupabaseClient,
    private readonly entityResolver: EntityResolver,
  ) {}

  async ingest(command: IngestCorporateSource): Promise<IngestionOutcome> {
    const parseResult = parseGovernmentContractSourceDocument(command);
    if (parseResult.status === "invalid") {
      return { status: "rejected", reason: parseResult.reason };
    }
    const { sourceDocument } = parseResult;
    if (sourceDocument.observedAt !== command.observedAt) {
      return { status: "rejected", reason: "invalid_source_document" };
    }

    const resolution = await this.entityResolver.resolve({
      observedName: sourceDocument.companyName,
      observedDomain: sourceDocument.companyDomain,
      jurisdiction: sourceDocument.jurisdiction,
    });
    if (resolution.status !== "resolved") {
      const reviewItemId = `review:${command.sourceId}` as ReviewQueueItemId;
      const reason =
        resolution.status === "review_required"
          ? resolution.reason
          : "low_confidence";
      const candidates =
        resolution.status === "review_required" ? resolution.candidates : [];
      return {
        status: "review_required",
        reviewItemId,
        reason,
        candidates,
      };
    }

    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeSourceUrl(command.sourceUrl);
    } catch {
      return { status: "rejected", reason: "invalid_source_url" };
    }

    const contentHash = createHash("sha256")
      .update(canonicalizeSourceDocument(command.sanitizedText), "utf8")
      .digest("hex");

    const externalReference: ExternalReference | null =
      sourceDocument.externalReference;
    const signalDiscriminator = signalDiscriminatorFor({
      companyId: resolution.companyId,
      externalReference,
    });

    const fingerprintInput = governmentContractFingerprintInput({
      normalizedUrl,
      contentHash,
      observedDate: sourceDocument.observedAt,
      externalReference,
      signalDiscriminator,
    });
    const signalFingerprint = computeSignalFingerprint(fingerprintInput);

    const structuredPayload = {
      contractType: "professional_services",
      observedAt: sourceDocument.observedAt,
    };

    const { data: runId, error: runError } = await this.client.rpc(
      "create_ingestion_run",
      { planned_total_items: 1 },
    );
    if (runError || !runId) {
      throw new Error(
        `Failed to create ingestion run: ${runError?.message ?? "no data"}`,
      );
    }
    const ingestionRunId = runId as string;

    const { data: rpcData, error: rpcError } = await this.client.rpc(
      "persist_government_contract_item",
      {
        candidate_ingestion_run_id: ingestionRunId,
        candidate_item_key: `item:${randomUUID()}`,
        candidate_correlation_id: randomUUID(),
        candidate_company_id: resolution.companyId,
        candidate_source_name: command.sourceName,
        candidate_source_url: command.sourceUrl,
        candidate_normalized_url: normalizedUrl,
        candidate_content_hash: contentHash,
        candidate_observed_date: sourceDocument.observedAt,
        candidate_external_reference: externalReference,
        candidate_signal_discriminator: signalDiscriminator,
        candidate_fingerprint_version: SIGNAL_FINGERPRINT_VERSION,
        candidate_fingerprint_canonical_input: fingerprintInput,
        candidate_signal_fingerprint: signalFingerprint,
        candidate_structured_payload: structuredPayload,
        candidate_confidence_score: sourceDocument.confidence,
        candidate_schema_version: sourceDocument.schemaVersion,
      },
    );

    if (rpcError || !rpcData) {
      throw new Error(
        `Ingestion RPC failed: ${rpcError?.message ?? "no data returned"}`,
      );
    }

    const result = (rpcData as ReadonlyArray<RpcResult>)[0] ?? (rpcData as RpcResult);
    const sourceId = result.source_id as unknown as SourceId;
    const signalId = result.signal_id as unknown as SignalId;

    return {
      status: "accepted",
      disposition:
        result.outcome === "accepted_created" ? "created" : "already_processed",
      companyId: resolution.companyId,
      sourceId,
      signalId,
    };
  }
}

export function createSupabaseGovernmentContractIngestionService(
  client: SupabaseClient,
  entityResolver: EntityResolver,
): SignalIngestionService {
  return new SupabaseGovernmentContractIngestionService(client, entityResolver);
}
