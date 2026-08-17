import { createHash } from "node:crypto";
import type { CompanyId, EntityResolver } from "../../entity-resolver/index.js";
import type {
  ExternalReference,
  GovernmentContractSignal,
  IngestCorporateSource,
  IngestionOutcome,
  ReviewQueueItem,
  ReviewQueueItemId,
  SignalId,
  SignalIngestionService,
  Source,
} from "../index.js";
import type { InMemoryRepositories } from "./in-memory-repositories.js";
import { normalizeSourceUrl } from "./in-memory-repositories.js";
import {
  canonicalizeSourceDocument,
  parseGovernmentContractSourceDocument,
} from "./source-document.js";

type GovernmentContractSourceDocument = {
  companyName: string;
  companyDomain: string;
  jurisdiction: string;
  contractType: "professional_services";
  observedAt: string;
  confidence: number;
  schemaVersion: "government-contract-signal/v1";
  externalReference: ExternalReference;
};

export type GovernmentContractPersistenceInput = {
  companyId: CompanyId;
  callerSourceId: Source["id"];
  source: Omit<Source, "id">;
  normalizedSourceUrl: string;
  sourceDocument: GovernmentContractSourceDocument;
};

export interface GovernmentContractAcceptedPersistence {
  persist(
    input: GovernmentContractPersistenceInput,
  ): Promise<IngestionOutcome>;
}

export interface GovernmentContractReviewQueue {
  save(item: ReviewQueueItem): void;
}


class GovernmentContractSignalIngestionService
  implements SignalIngestionService
{
  constructor(
    private readonly entityResolver: EntityResolver,
    private readonly acceptedPersistence: GovernmentContractAcceptedPersistence,
    private readonly reviewQueue: GovernmentContractReviewQueue,
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
      this.reviewQueue.save({
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

    return this.acceptedPersistence.persist({
      companyId: resolution.companyId,
      callerSourceId: command.sourceId,
      source: {
        name: command.sourceName,
        url: command.sourceUrl,
        contentHash,
      },
      normalizedSourceUrl: normalizedUrl,
      sourceDocument,
    });
  }
}

export function createGovernmentContractSignalIngestionServiceWithPersistence(
  entityResolver: EntityResolver,
  acceptedPersistence: GovernmentContractAcceptedPersistence,
  reviewQueue: GovernmentContractReviewQueue,
): SignalIngestionService {
  return new GovernmentContractSignalIngestionService(
    entityResolver,
    acceptedPersistence,
    reviewQueue,
  );
}

export function createGovernmentContractSignalIngestionService(
  entityResolver: EntityResolver,
  repositories: InMemoryRepositories,
): SignalIngestionService {
  const acceptedPersistence: GovernmentContractAcceptedPersistence = {
    async persist(input) {
      const existingSource = repositories.sources.findByIdentity(
        input.normalizedSourceUrl,
        input.source.contentHash,
      );
      const sourceId = existingSource?.id ?? input.callerSourceId;
      if (
        existingSource === undefined &&
        repositories.sources.findById(input.callerSourceId) !== undefined
      ) {
        return { status: "rejected", reason: "source_identity_conflict" };
      }
      const existingSignal = repositories.signals.findGovernmentContract({
        companyId: input.companyId,
        sourceId,
        observedAt: input.sourceDocument.observedAt,
        externalReference: input.sourceDocument.externalReference,
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
        `signal:${sourceId}:${input.sourceDocument.externalReference}` as SignalId;
      const signal: GovernmentContractSignal = {
        id: signalId,
        sourceId,
        companyId: input.companyId,
        signalType: "government_contract_awarded",
        contractType: input.sourceDocument.contractType,
        observedAt: input.sourceDocument.observedAt,
        confidence: input.sourceDocument.confidence,
        schemaVersion: input.sourceDocument.schemaVersion,
        externalReference: input.sourceDocument.externalReference,
      };

      if (existingSource === undefined) {
        repositories.sources.save({ id: sourceId, ...input.source });
      }
      repositories.signals.save(signal);
      return {
        status: "accepted",
        signalId,
        companyId: input.companyId,
        sourceId,
        disposition: "created",
      };
    },
  };

  return createGovernmentContractSignalIngestionServiceWithPersistence(
    entityResolver,
    acceptedPersistence,
    repositories.reviewQueue,
  );
}
