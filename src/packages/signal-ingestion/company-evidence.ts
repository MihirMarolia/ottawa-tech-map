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

export type OfferingEvidence = {
  signalId: SignalId;
  signalType: "product_added" | "service_added" | "product_changed" | "service_changed";
  observedAt: string;
  evidenceType:
    | "official_product_page"
    | "official_service_page"
    | "official_company_page"
    | "official_documentation"
    | "official_press_release"
    | "government_record"
    | "other_primary_source";
  confidence: number;
  source: {
    id: SourceId;
    name: string;
    url: string;
  };
};

export type Offering = {
  name: string;
  description?: string;
  status: "active" | "unknown";
  firstObservedAt?: string;
  lastObservedAt?: string;
  evidence: ReadonlyArray<OfferingEvidence>;
};

export type Product = Offering & { kind: "product" };
export type Service = Offering & { kind: "service" };

export type CompanyProfile = {
  company: Company;
  products: ReadonlyArray<Product>;
  services: ReadonlyArray<Service>;
  evidence: ReadonlyArray<GovernmentContractEvidence>;
};

export type PublicCompanySummary = {
  canonicalName: string;
  canonicalDomain: string;
  jurisdiction: string;
};

export type CompanySearchResult = {
  company: PublicCompanySummary;
  evidenceCount: number;
  offeringCount: number;
  latestObservedAt?: string;
};

export interface CompanyEvidenceQuery {
  findCompanyProfile(companyId: CompanyId): Promise<CompanyProfile | null>;
}

export interface CompanySearchQuery {
  searchCompanies(query: string): Promise<ReadonlyArray<CompanySearchResult>>;
}
