import type {
  CompanyEvidenceSet,
  CompanyIntelligenceScorer,
  ExplainableCompanyScore,
  SignalId,
} from "../index.js";
import type { CompanyId } from "../../entity-resolver/index.js";

describe("CompanyIntelligenceScorer contract", () => {
  it("accepts the public interface shape", () => {
    const scorer: CompanyIntelligenceScorer = {
      calculate: async (
        _companyId: CompanyId,
        _evidence: CompanyEvidenceSet,
      ): Promise<ExplainableCompanyScore> => ({
        score: 0,
        version: "0",
        components: [],
        penalties: [],
        evidenceSignalIds: [] as ReadonlyArray<SignalId>,
        calculatedAt: new Date(0).toISOString(),
      }),
    };

    expect(scorer.calculate).toBeDefined();
  });
});
