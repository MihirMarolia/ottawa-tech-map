import { createHash } from "node:crypto";
import type { EntityResolver } from "../../entity-resolver/index.js";
import type {
  GovernmentContractSignal,
  IngestCorporateSource,
  IngestionOutcome,
  SignalId,
  SignalIngestionService,
} from "../index.js";
import type { InMemoryRepositories } from "./in-memory-repositories.js";

type GovernmentContractSourceDocument = {
  companyName: string;
  companyDomain: string;
  jurisdiction: string;
  contractType: "professional_services";
  observedAt: string;
  confidence: number;
  schemaVersion: "government-contract-signal/v1";
};

function parseGovernmentContractSourceDocument(
  command: IngestCorporateSource,
): GovernmentContractSourceDocument | null {
  try {
    const value: unknown = JSON.parse(command.sanitizedText);
    if (
      typeof value !== "object" ||
      value === null ||
      !("companyName" in value) ||
      typeof value.companyName !== "string" ||
      !("companyDomain" in value) ||
      typeof value.companyDomain !== "string" ||
      !("jurisdiction" in value) ||
      typeof value.jurisdiction !== "string" ||
      !("contractType" in value) ||
      value.contractType !== "professional_services" ||
      !("observedAt" in value) ||
      typeof value.observedAt !== "string" ||
      !("confidence" in value) ||
      typeof value.confidence !== "number" ||
      value.confidence < 0 ||
      value.confidence > 1 ||
      !("schemaVersion" in value) ||
      value.schemaVersion !== "government-contract-signal/v1"
    ) {
      return null;
    }

    return {
      companyName: value.companyName,
      companyDomain: value.companyDomain,
      jurisdiction: value.jurisdiction,
      contractType: value.contractType,
      observedAt: value.observedAt,
      confidence: value.confidence,
      schemaVersion: value.schemaVersion,
    };
  } catch {
    return null;
  }
}

class GovernmentContractSignalIngestionService
  implements SignalIngestionService
{
  constructor(
    private readonly entityResolver: EntityResolver,
    private readonly repositories: InMemoryRepositories,
  ) {}

  async ingest(command: IngestCorporateSource): Promise<IngestionOutcome> {
    const existingSignal = this.repositories.signals.findBySourceId(
      command.sourceId,
    );
    if (existingSignal !== undefined) {
      return {
        status: "accepted",
        signalId: existingSignal.id,
        companyId: existingSignal.companyId,
      };
    }

    const sourceDocument = parseGovernmentContractSourceDocument(command);
    if (
      sourceDocument === null ||
      sourceDocument.observedAt !== command.observedAt
    ) {
      return { status: "rejected", reason: "invalid_source_document" };
    }

    const resolution = await this.entityResolver.resolve({
      observedName: sourceDocument.companyName,
      observedDomain: sourceDocument.companyDomain,
      jurisdiction: sourceDocument.jurisdiction,
    });
    if (resolution.status !== "resolved") {
      return {
        status: "review_required",
        reason: "company_not_resolved",
      };
    }

    const signalId = `signal:${command.sourceId}` as SignalId;
    const signal: GovernmentContractSignal = {
      id: signalId,
      sourceId: command.sourceId,
      companyId: resolution.companyId,
      signalType: "government_contract_awarded",
      contractType: sourceDocument.contractType,
      observedAt: sourceDocument.observedAt,
      confidence: sourceDocument.confidence,
      schemaVersion: sourceDocument.schemaVersion,
    };

    this.repositories.sources.save({
      id: command.sourceId,
      name: command.sourceName,
      url: command.sourceUrl,
      contentHash: createHash("sha256")
        .update(command.sanitizedText)
        .digest("hex"),
    });
    this.repositories.signals.save(signal);

    return {
      status: "accepted",
      signalId,
      companyId: resolution.companyId,
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
