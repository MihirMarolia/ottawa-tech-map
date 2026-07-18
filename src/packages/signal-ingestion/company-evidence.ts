import type { Company, CompanyId } from "../entity-resolver/index.js";
import type { SignalId, SourceId } from "./index.js";

export type GovernmentContractEvidence = {
  signalId: SignalId;
  signalType: "government_contract_awarded";
  contractType: "professional_services";
  observedAt: string;
  confidence: number;
  schemaVersion: "government-contract-signal/v1";
  source: {
    id: SourceId;
    name: string;
    url: string;
  };
};

export type CompanyProfile = {
  company: Company;
  evidence: ReadonlyArray<GovernmentContractEvidence>;
};

export interface CompanyEvidenceQuery {
  findCompanyProfile(companyId: CompanyId): Promise<CompanyProfile | null>;
}
