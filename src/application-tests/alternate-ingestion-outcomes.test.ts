import { describe, expect, it } from "vitest";
import { renderReviewQueue } from "../apps/web/index.js";
import {
  existingFixtureCompany,
  fictionalGovernmentContractFixture,
} from "../fixtures/government-contract.js";
import type { RawSourceText } from "../packages/privacy-gateway/index.js";
import { createGovernmentContractFixtureApplication } from "../packages/signal-ingestion/government-contract-application.js";

describe("alternate government-contract ingestion outcomes", () => {
  it("rejects a fixture that fails privacy verification without persisting it", async () => {
    const unsafeContact = ["operator", "example.test"].join("@");
    const unsafeFixture = {
      ...fictionalGovernmentContractFixture,
      rawText: fictionalGovernmentContractFixture.rawText.replace(
        /}$/,
        `,"contact":"${unsafeContact}"}`,
      ) as RawSourceText,
    };
    const application = createGovernmentContractFixtureApplication({
      companies: [existingFixtureCompany],
    });

    await expect(
      application.ingestGovernmentContractFixture(unsafeFixture),
    ).resolves.toEqual({ status: "rejected", reason: "privacy_rejected" });
    expect(application.inspectInMemoryPersistence()).toEqual({
      companyCount: 1,
      sourceCount: 0,
      signalCount: 0,
    });
    await expect(application.reviewQueueQuery.list()).resolves.toEqual([]);
  });

  it("routes conflicting name/domain evidence to review without persisting a Signal", async () => {
    const companyWithConflictingName = {
      ...existingFixtureCompany,
      canonicalName: "Northstar Civic Holdings",
    };
    const application = createGovernmentContractFixtureApplication({
      companies: [companyWithConflictingName],
    });

    const outcome = await application.ingestGovernmentContractFixture(
      fictionalGovernmentContractFixture,
    );

    expect(outcome).toEqual({
      status: "review_required",
      reviewItemId: `review:${fictionalGovernmentContractFixture.source.id}`,
      reason: "conflicting_evidence",
      candidates: [
        {
          companyId: existingFixtureCompany.id,
          observedName: companyWithConflictingName.canonicalName,
          observedDomain: companyWithConflictingName.canonicalDomain,
          confidence: 1,
        },
      ],
    });
    expect(application.inspectInMemoryPersistence()).toEqual({
      companyCount: 1,
      sourceCount: 0,
      signalCount: 0,
    });

    const reviewItems = await application.reviewQueueQuery.list();
    expect(reviewItems).toHaveLength(1);
    expect(reviewItems[0]).toMatchObject({
      id: `review:${fictionalGovernmentContractFixture.source.id}`,
      reason: "conflicting_evidence",
      source: fictionalGovernmentContractFixture.source,
    });
    expect(JSON.stringify(reviewItems)).not.toContain(
      fictionalGovernmentContractFixture.rawText,
    );

    const html = renderReviewQueue(reviewItems);
    expect(html).toContain("Conflicting evidence");
    expect(html).toContain(fictionalGovernmentContractFixture.source.name);
    expect(html).toContain(companyWithConflictingName.canonicalName);
    expect(html).not.toContain(fictionalGovernmentContractFixture.rawText);
  });
});
