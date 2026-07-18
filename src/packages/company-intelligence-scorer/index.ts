import type { CompanyId } from "../entity-resolver/index.js";
import type { SignalId } from "../signal-ingestion/index.js";

export type ScoreComponent = {
  id: string;
  label: string;
  weight: number;
  value: number;
  evidenceSignalIds: ReadonlyArray<SignalId>;
};

export type ScorePenalty = {
  id: string;
  label: string;
  amount: number;
  evidenceSignalIds: ReadonlyArray<SignalId>;
};

export type ExplainableCompanyScore = {
  score: number;
  version: string;
  components: ReadonlyArray<ScoreComponent>;
  penalties: ReadonlyArray<ScorePenalty>;
  evidenceSignalIds: ReadonlyArray<SignalId>;
  calculatedAt: string;
};

export type CompanyEvidenceSet = {
  companyId: CompanyId;
  signalIds: ReadonlyArray<SignalId>;
};

export interface CompanyIntelligenceScorer {
  calculate(
    companyId: CompanyId,
    evidence: CompanyEvidenceSet,
  ): Promise<ExplainableCompanyScore>;
}
