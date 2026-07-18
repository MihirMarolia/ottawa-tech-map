import type { SanitizedCorporateText } from "../privacy-gateway/index.js";
import type { CompanyId } from "../entity-resolver/index.js";

export type SignalId = string & { readonly __brand: "SignalId" };
export type SourceId = string & { readonly __brand: "SourceId" };

export type IngestCorporateSource = {
  sourceId: SourceId;
  sourceName: string;
  sanitizedText: SanitizedCorporateText;
  sourceUrl: string;
  observedAt: string;
};

export type IngestionOutcomeStatus = "accepted" | "rejected" | "review_required";

export type IngestionOutcome =
  | {
      status: "accepted";
      signalId: SignalId;
      companyId: CompanyId;
    }
  | {
      status: "rejected";
      reason: string;
    }
  | {
      status: "review_required";
      reason: string;
    };

export interface SignalIngestionService {
  ingest(command: IngestCorporateSource): Promise<IngestionOutcome>;
}

export type ExtractedSignalDraft = {
  signalType: string;
  schemaVersion: string;
  observationDate: string;
};

export interface SignalExtractor {
  extractSignals(input: SanitizedCorporateText): Promise<ReadonlyArray<ExtractedSignalDraft>>;
}

export type Source = {
  id: SourceId;
  name: string;
  url: string;
  contentHash: string;
};

export type GovernmentContractSignal = {
  id: SignalId;
  sourceId: SourceId;
  companyId: CompanyId;
  signalType: "government_contract_awarded";
  contractType: "professional_services";
  observedAt: string;
  confidence: number;
  schemaVersion: "government-contract-signal/v1";
};

export type GovernmentContractFixture = {
  source: {
    id: SourceId;
    name: string;
    url: string;
  };
  observedAt: string;
  rawText: import("../privacy-gateway/index.js").RawSourceText;
};
