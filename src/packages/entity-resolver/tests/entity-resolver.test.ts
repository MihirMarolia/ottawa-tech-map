import type {
  CompanyReference,
  CompanyId,
  EntityResolutionResult,
  EntityResolver,
} from "../index.js";

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
});
