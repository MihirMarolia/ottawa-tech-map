import type { SanitizedCorporateText } from "../privacy-gateway/index.js";
import type {
  CompanyId,
  ResolutionCandidate,
  ReviewReason,
} from "../entity-resolver/index.js";

export type SignalId = string & { readonly __brand: "SignalId" };
export type SourceId = string & { readonly __brand: "SourceId" };
export type ReviewQueueItemId = string & {
  readonly __brand: "ReviewQueueItemId";
};
export type ExternalReference = string & {
  readonly __brand: "ExternalReference";
};

export type IngestCorporateSource = {
  sourceId: SourceId;
  sourceName: string;
  sanitizedText: SanitizedCorporateText;
  sourceUrl: string;
  observedAt: string;
};

export type IngestionOutcomeStatus = "accepted" | "rejected" | "review_required";

export type AcceptedIngestionOutcome = {
  status: "accepted";
  disposition: "created" | "already_processed";
  companyId: CompanyId;
  sourceId: SourceId;
  signalId: SignalId;
};

export type RejectionReason =
  | "privacy_rejected"
  | "invalid_source_document"
  | "invalid_external_reference"
  | "invalid_source_url"
  | "source_identity_conflict";

export type IngestionOutcome =
  | AcceptedIngestionOutcome
  | {
      status: "rejected";
      reason: RejectionReason;
    }
  | {
      status: "review_required";
      reviewItemId: ReviewQueueItemId;
      reason: ReviewReason;
      candidates: ReadonlyArray<ResolutionCandidate>;
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

export type ReviewQueueItem = {
  id: ReviewQueueItemId;
  reason: ReviewReason;
  candidates: ReadonlyArray<ResolutionCandidate>;
  source: {
    id: SourceId;
    name: string;
    url: string;
  };
};

export interface ReviewQueueQuery {
  list(): Promise<ReadonlyArray<ReviewQueueItem>>;
}

export type GovernmentContractSignal = {
  id: SignalId;
  sourceId: SourceId;
  companyId: CompanyId;
  signalType: "government_contract_awarded";
  contractType: "professional_services";
  observedAt: string;
  confidence: number;
  schemaVersion: "government-contract-signal/v1";
  externalReference: ExternalReference;
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

export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "temporary"
  | "unknown";

export type JobPostingSignal = {
  id: SignalId;
  sourceId: SourceId;
  companyId: CompanyId;
  signalType: "job_posting_observed";
  jobTitle: string;
  location: string;
  postingDate: string;
  technologies: ReadonlyArray<string>;
  securityClearanceRequired: boolean;
  bilingualRequired: boolean;
  employmentType: EmploymentType;
  expansionEvidence: boolean;
  observedAt: string;
  confidence: number;
  schemaVersion: "job-posting-signal/v1";
  externalReference: ExternalReference | null;
};

export type JobPostingFixture = {
  source: { id: SourceId; name: string; url: string };
  observedAt: string;
  rawText: import("../privacy-gateway/index.js").RawSourceText;
};
