import type {
  Company,
  CompanyReference,
  EntityResolutionResult,
  EntityResolver,
} from "../index.js";

class ExactCanonicalDomainEntityResolver implements EntityResolver {
  constructor(private readonly companies: ReadonlyArray<Company>) {}

  async resolve(input: CompanyReference): Promise<EntityResolutionResult> {
    const company = this.companies.find(
      (candidate) => candidate.canonicalDomain === input.observedDomain,
    );

    if (company === undefined) {
      return {
        status: "new_company",
        proposedCompany: {
          observedName: input.observedName,
          observedDomain: input.observedDomain,
          jurisdiction: input.jurisdiction,
        },
      };
    }

    return {
      status: "resolved",
      companyId: company.id,
      resolutionMethod: "canonical_domain",
      confidence: 1,
    };
  }
}

export function createExactCanonicalDomainEntityResolver(
  companies: ReadonlyArray<Company>,
): EntityResolver {
  return new ExactCanonicalDomainEntityResolver(companies);
}
