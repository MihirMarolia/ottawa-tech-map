import type { SanitizedCorporateText } from "../privacy-gateway/index.js";
import type { SourceId } from "./index.js";

export type ExtractionConfidence = "high" | "medium" | "low";
export type EvidenceLocation = { start: number; end: number };
export type ModelExtractedField<T> = {
  value: T;
  evidenceLocation: EvidenceLocation;
  confidence: ExtractionConfidence;
};

export type JobPostingModelOutput = {
  jobTitle: ModelExtractedField<string>;
  location: ModelExtractedField<string>;
  technologies: ReadonlyArray<ModelExtractedField<string>>;
  securityClearanceRequirement: ModelExtractedField<true> | null;
  bilingualRequirement: ModelExtractedField<true> | null;
  expansionEvidence: ModelExtractedField<true> | null;
};

export interface JobPostingExtractionModel {
  readonly modelVersion: string;
  extract(input: SanitizedCorporateText): Promise<JobPostingModelOutput>;
}

export type ExtractedField<T> = ModelExtractedField<T> & {
  sourceId: SourceId;
  observedAt: string;
  modelVersion: string;
  extractorVersion: "job-posting-extractor/v1";
};

export type JobPostingExtractionProposal = {
  status: "review_required";
  sourceId: SourceId;
  observedAt: string;
  jobTitle: ExtractedField<string>;
  location: ExtractedField<string>;
  technologies: ReadonlyArray<ExtractedField<string>>;
  securityClearanceRequirement: ExtractedField<true> | null;
  bilingualRequirement: ExtractedField<true> | null;
  expansionEvidence: ExtractedField<true> | null;
};

export type JobPostingExtractionResult =
  | { status: "proposed"; proposal: JobPostingExtractionProposal }
  | { status: "rejected"; reason: "invalid_model_output" };

export interface JobPostingExtractionService {
  extract(command: {
    sourceId: SourceId;
    observedAt: string;
    sanitizedText: SanitizedCorporateText;
  }): Promise<JobPostingExtractionResult>;
}

export type JobPostingExtractionEvaluationCase = {
  key: string;
  sourceId: SourceId;
  observedAt: string;
  sanitizedText: SanitizedCorporateText;
  expected: {
    technologies: ReadonlyArray<string>;
    securityClearanceRequirement: boolean;
    bilingualRequirement: boolean;
  };
};

export type JobPostingExtractionEvaluation = {
  caseCount: number;
  clearancePrecision: number;
  bilingualPrecision: number;
  technologyPrecision: number;
  passed: boolean;
  validCaseCount: number;
};

export {
  createJobPostingExtractionService,
  evaluateJobPostingExtractor,
} from "./lib/job-posting-extraction-service.js";
