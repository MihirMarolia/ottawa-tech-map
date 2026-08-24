import { describe, expect, it } from "vitest";
import {
  existingFixtureCompany,
  fictionalGovernmentContractFixture,
} from "../fixtures/government-contract.js";
import { renderCompanyProfile } from "../apps/web/index.js";
import { createGovernmentContractFixtureApplication } from "../packages/signal-ingestion/government-contract-application.js";

describe("government contract fixture to Company profile Evidence", () => {
  it("accepts, resolves, persists once, queries, and presents the Signal", async () => {
    const application = createGovernmentContractFixtureApplication({
      companies: [existingFixtureCompany],
    });

    const firstOutcome = await application.ingestGovernmentContractFixture(
      fictionalGovernmentContractFixture,
    );
    const secondOutcome = await application.ingestGovernmentContractFixture(
      fictionalGovernmentContractFixture,
    );

    expect(firstOutcome).toMatchObject({
      status: "accepted",
      companyId: existingFixtureCompany.id,
      sourceId: fictionalGovernmentContractFixture.source.id,
      disposition: "created",
    });
    expect(secondOutcome).toMatchObject({
      status: "accepted",
      companyId: existingFixtureCompany.id,
      sourceId: fictionalGovernmentContractFixture.source.id,
      disposition: "already_processed",
    });
    expect(secondOutcome.status === "accepted" && firstOutcome.status === "accepted"
      ? secondOutcome.signalId
      : null).toBe(
      firstOutcome.status === "accepted" ? firstOutcome.signalId : null,
    );

    const companyProfile = await application.companyEvidenceQuery.findCompanyProfile(
      existingFixtureCompany.id,
    );

    expect(companyProfile).toEqual({
      company: existingFixtureCompany,
      products: [],
      services: [],
      evidence: [
        {
          signalId: firstOutcome.status === "accepted" ? firstOutcome.signalId : "",
          signalType: "government_contract_awarded",
          contractType: "professional_services",
          observedAt: "2026-06-30",
          confidence: 0.98,
          schemaVersion: "government-contract-signal/v1",
          source: {
            id: fictionalGovernmentContractFixture.source.id,
            name: "Canadian Public Procurement Fixture",
            url: "https://contracts.example/notices/contract-2026-001",
          },
        },
      ],
    });
    const html = renderCompanyProfile(companyProfile);
    expect(html).toContain("Northstar Civic Systems");
    expect(html).toContain("Professional services");
    expect(html).toContain("2026-06-30");
    expect(html).toContain("98%");
    expect(html).toContain("Canadian Public Procurement Fixture");
    expect(html).toContain(
      "https://contracts.example/notices/contract-2026-001",
    );
    expect(html).not.toContain(fictionalGovernmentContractFixture.rawText);
  });
});
