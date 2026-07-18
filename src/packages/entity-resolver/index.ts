export type CompanyId = string & { readonly __brand: "CompanyId" };

export type Company = {
  id: CompanyId;
  canonicalName: string;
  canonicalDomain: string;
  jurisdiction: string;
};

export type CompanyReference = {
  observedName: string;
  observedDomain: string;
  jurisdiction: string;
};

export type ResolutionMethod = "canonical_domain";

export type ProposedCompany = {
  observedName: string;
  observedDomain: string;
  jurisdiction: string;
};

export type ResolutionCandidate = {
  companyId: CompanyId;
  observedName: string;
  observedDomain: string;
  confidence: number;
};

export type ReviewReason = "conflicting_evidence" | "low_confidence";

export type EntityResolutionResult =
  | {
      status: "resolved";
      companyId: CompanyId;
      resolutionMethod: ResolutionMethod;
      confidence: number;
    }
  | {
      status: "new_company";
      proposedCompany: ProposedCompany;
    }
  | {
      status: "review_required";
      candidates: ReadonlyArray<ResolutionCandidate>;
      reason: ReviewReason;
    };

export interface EntityResolver {
  resolve(input: CompanyReference): Promise<EntityResolutionResult>;
}

export { createExactCanonicalDomainEntityResolver } from "./lib/exact-canonical-domain-entity-resolver.js";
