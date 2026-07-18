import type { SanitizedCorporateText } from "../privacy-gateway/index.js";
import type { CompanyId } from "../entity-resolver/index.js";

export type SignalId = string & { readonly __brand: "SignalId" };
export type SourceId = string & { readonly __brand: "SourceId" };

export type IngestCorporateSource = {
  sourceId: SourceId;
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
