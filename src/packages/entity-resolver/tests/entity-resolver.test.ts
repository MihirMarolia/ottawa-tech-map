import type {
  CompanyReference,
  Company,
  CompanyId,
  EntityResolutionResult,
  EntityResolver,
} from "../index.js";
import { createExactCanonicalDomainEntityResolver } from "../index.js";

describe("EntityResolver contract", () => {
  it("accepts the public interface shape", () => {
    const resolver: EntityResolver = {
      resolve: async (
        _input: CompanyReference,
      ): Promise<EntityResolutionResult> => ({
        status: "resolved",
        companyId: "company-1" as CompanyId,
        resolutionMethod: "canonical_domain",
        confidence: 1,
      }),
    };

    expect(resolver.resolve).toBeDefined();
  });

  it("resolves an exact canonical-domain match", async () => {
    const company: Company = {
      id: "company:northstar-civic" as CompanyId,
      canonicalName: "Northstar Civic Systems",
      canonicalDomain: "northstar-civic.example",
      jurisdiction: "CA-ON",
    };
    const resolver = createExactCanonicalDomainEntityResolver([company]);

    await expect(
      resolver.resolve({
        observedName: company.canonicalName,
        observedDomain: company.canonicalDomain,
        jurisdiction: company.jurisdiction,
      }),
    ).resolves.toEqual({
      status: "resolved",
      companyId: company.id,
      resolutionMethod: "canonical_domain",
      confidence: 1,
    });
  });
});
