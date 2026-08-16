import { createHash } from "node:crypto";
import type { EntityResolver } from "../../entity-resolver/index.js";
import type {
  ExternalReference,
  GovernmentContractSignal,
  IngestCorporateSource,
  IngestionOutcome,
  ReviewQueueItemId,
  SignalId,
  SignalIngestionService,
} from "../index.js";
import type { InMemoryRepositories } from "./in-memory-repositories.js";
import { normalizeSourceUrl } from "./in-memory-repositories.js";
import {
  canonicalizeSourceDocument,
  parseGovernmentContractSourceDocument,
} from "./source-document.js";

class GovernmentContractSignalIngestionService
  implements SignalIngestionService
{
  constructor(
    private readonly entityResolver: EntityResolver,
    private readonly repositories: InMemoryRepositories,
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
      this.repositories.reviewQueue.save({
        id: reviewItemId,
        reason,
        candidates,
        source: {
          id: command.sourceId,
          name: command.sourceName,
          url: command.sourceUrl,
        },
      });
      return {
        status: "review_required",
        reviewItemId,
        reason,
        candidates,
      };
    }

    const contentHash = createHash("sha256")
      .update(canonicalizeSourceDocument(command.sanitizedText), "utf8")
      .digest("hex");
    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeSourceUrl(command.sourceUrl);
    } catch {
      return { status: "rejected", reason: "invalid_source_url" };
    }
    const existingSource = this.repositories.sources.findByIdentity(
      normalizedUrl,
      contentHash,
    );
    const sourceId = existingSource?.id ?? command.sourceId;
    if (
      existingSource === undefined &&
      this.repositories.sources.findById(command.sourceId) !== undefined
    ) {
      return { status: "rejected", reason: "source_identity_conflict" };
    }
    const existingSignal = this.repositories.signals.findGovernmentContract({
      companyId: resolution.companyId,
      sourceId,
      observedAt: sourceDocument.observedAt,
      externalReference: sourceDocument.externalReference,
    });
    if (existingSignal !== undefined) {
      return {
        status: "accepted",
        signalId: existingSignal.id,
        companyId: existingSignal.companyId,
        sourceId: existingSignal.sourceId,
        disposition: "already_processed",
      };
    }

    const signalId =
      `signal:${sourceId}:${sourceDocument.externalReference}` as SignalId;
    const signal: GovernmentContractSignal = {
      id: signalId,
      sourceId,
      companyId: resolution.companyId,
      signalType: "government_contract_awarded",
      contractType: sourceDocument.contractType,
      observedAt: sourceDocument.observedAt,
      confidence: sourceDocument.confidence,
      schemaVersion: sourceDocument.schemaVersion,
      externalReference: sourceDocument.externalReference,
    };

    if (existingSource === undefined) {
      this.repositories.sources.save({
        id: sourceId,
        name: command.sourceName,
        url: command.sourceUrl,
        contentHash,
      });
    }
    this.repositories.signals.save(signal);

    return {
      status: "accepted",
      signalId,
      companyId: resolution.companyId,
      sourceId,
      disposition: "created",
    };
  }
}

export function createGovernmentContractSignalIngestionService(
  entityResolver: EntityResolver,
  repositories: InMemoryRepositories,
): SignalIngestionService {
  return new GovernmentContractSignalIngestionService(
    entityResolver,
    repositories,
  );
}
