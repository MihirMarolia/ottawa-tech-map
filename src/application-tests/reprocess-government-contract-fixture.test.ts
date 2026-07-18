import { describe, expect, it } from "vitest";
import {
  existingFixtureCompany,
  fictionalGovernmentContractFixture,
} from "../fixtures/government-contract.js";
import { createGovernmentContractFixtureApplication } from "../packages/signal-ingestion/government-contract-application.js";
import type { RawSourceText } from "../packages/privacy-gateway/index.js";
import type { SourceId } from "../packages/signal-ingestion/index.js";

describe("government-contract fixture idempotency", () => {
  it("deduplicates the same Source and Signal without changing the Company", async () => {
    const firstApplication = createGovernmentContractFixtureApplication({
      companies: [existingFixtureCompany],
    });

    const firstOutcome = await firstApplication.ingestGovernmentContractFixture(
      fictionalGovernmentContractFixture,
    );
    const secondOutcome = await firstApplication.ingestGovernmentContractFixture(
      fictionalGovernmentContractFixture,
    );

    expect(firstOutcome).toMatchObject({
      status: "accepted",
      disposition: "created",
      sourceId: fictionalGovernmentContractFixture.source.id,
      companyId: existingFixtureCompany.id,
    });
    expect(secondOutcome).toMatchObject({
      status: "accepted",
      disposition: "already_processed",
      sourceId: fictionalGovernmentContractFixture.source.id,
      companyId: existingFixtureCompany.id,
    });
    expect(secondOutcome.status === "accepted" && firstOutcome.status === "accepted"
      ? secondOutcome.signalId
      : null).toBe(
      firstOutcome.status === "accepted" ? firstOutcome.signalId : null,
    );
    expect(firstApplication.inspectInMemoryPersistence()).toEqual({
      companyCount: 1,
      sourceCount: 1,
      signalCount: 1,
    });

    const firstProfile = await firstApplication.companyEvidenceQuery.findCompanyProfile(
      existingFixtureCompany.id,
    );
    expect(firstProfile?.evidence).toHaveLength(1);

    const freshApplication = createGovernmentContractFixtureApplication({
      companies: [existingFixtureCompany],
    });
    const freshFirstOutcome =
      await freshApplication.ingestGovernmentContractFixture(
        fictionalGovernmentContractFixture,
      );
    const freshSecondOutcome =
      await freshApplication.ingestGovernmentContractFixture(
        fictionalGovernmentContractFixture,
      );

    expect(freshFirstOutcome).toEqual(firstOutcome);
    expect(freshSecondOutcome).toEqual(secondOutcome);
    expect(freshApplication.inspectInMemoryPersistence()).toEqual({
      companyCount: 1,
      sourceCount: 1,
      signalCount: 1,
    });
  });

  it("deduplicates Source identity independently of a caller-provided Source ID", async () => {
    const application = createGovernmentContractFixtureApplication({
      companies: [existingFixtureCompany],
    });
    const replayedFixture = {
      ...fictionalGovernmentContractFixture,
      source: {
        ...fictionalGovernmentContractFixture.source,
        id: "source:collector-replay" as SourceId,
      },
    };

    const firstOutcome = await application.ingestGovernmentContractFixture(
      fictionalGovernmentContractFixture,
    );
    const replayOutcome = await application.ingestGovernmentContractFixture(
      replayedFixture,
    );

    expect(replayOutcome).toMatchObject({
      status: "accepted",
      disposition: "already_processed",
      sourceId: fictionalGovernmentContractFixture.source.id,
    });
    expect(replayOutcome.status === "accepted" && firstOutcome.status === "accepted"
      ? replayOutcome.signalId
      : null).toBe(
      firstOutcome.status === "accepted" ? firstOutcome.signalId : null,
    );
    expect(application.inspectInMemoryPersistence()).toEqual({
      companyCount: 1,
      sourceCount: 1,
      signalCount: 1,
    });
  });

  it("keeps a later government-contract Signal for the same Company", async () => {
    const application = createGovernmentContractFixtureApplication({
      companies: [existingFixtureCompany],
    });
    const laterFixture = {
      ...fictionalGovernmentContractFixture,
      source: {
        ...fictionalGovernmentContractFixture.source,
        id: "source:contract-2026-002" as SourceId,
        url: "https://contracts.example/notices/contract-2026-002",
      },
      observedAt: "2026-07-01",
      rawText: fictionalGovernmentContractFixture.rawText
        .replace("2026-06-30", "2026-07-01")
        .replace(
          "contract-2026-001",
          "contract-2026-002",
        ) as RawSourceText,
    };

    const firstOutcome = await application.ingestGovernmentContractFixture(
      fictionalGovernmentContractFixture,
    );
    const laterOutcome = await application.ingestGovernmentContractFixture(
      laterFixture,
    );

    expect(firstOutcome).toMatchObject({
      status: "accepted",
      disposition: "created",
      sourceId: fictionalGovernmentContractFixture.source.id,
    });
    expect(laterOutcome).toMatchObject({
      status: "accepted",
      disposition: "created",
      sourceId: laterFixture.source.id,
      companyId: existingFixtureCompany.id,
    });
    expect(application.inspectInMemoryPersistence()).toEqual({
      companyCount: 1,
      sourceCount: 2,
      signalCount: 2,
    });

    const profile = await application.companyEvidenceQuery.findCompanyProfile(
      existingFixtureCompany.id,
    );
    expect(profile?.evidence).toHaveLength(2);
  });

  it("canonicalizes line endings and outer whitespace before hashing", async () => {
    const application = createGovernmentContractFixtureApplication({
      companies: [existingFixtureCompany],
    });
    const windowsFixture = {
      ...fictionalGovernmentContractFixture,
      rawText: `\r\n${fictionalGovernmentContractFixture.rawText}\r\n` as RawSourceText,
    };
    const unixReplay = {
      ...fictionalGovernmentContractFixture,
      source: {
        ...fictionalGovernmentContractFixture.source,
        id: "source:canonical-replay" as SourceId,
      },
      rawText: `\n${fictionalGovernmentContractFixture.rawText}\n` as RawSourceText,
    };

    const firstOutcome = await application.ingestGovernmentContractFixture(
      windowsFixture,
    );
    const replayOutcome = await application.ingestGovernmentContractFixture(
      unixReplay,
    );

    expect(firstOutcome).toMatchObject({
      status: "accepted",
      disposition: "created",
    });
    expect(replayOutcome).toMatchObject({
      status: "accepted",
      disposition: "already_processed",
      sourceId: fictionalGovernmentContractFixture.source.id,
    });
    expect(application.inspectInMemoryPersistence()).toEqual({
      companyCount: 1,
      sourceCount: 1,
      signalCount: 1,
    });
  });

  it("rejects reuse of a Source ID for different provenance", async () => {
    const application = createGovernmentContractFixtureApplication({
      companies: [existingFixtureCompany],
    });
    const conflictingFixture = {
      ...fictionalGovernmentContractFixture,
      source: {
        ...fictionalGovernmentContractFixture.source,
        url: "https://contracts.example/notices/contract-2026-002",
      },
      observedAt: "2026-07-01",
      rawText: fictionalGovernmentContractFixture.rawText
        .replace("2026-06-30", "2026-07-01")
        .replace("contract-2026-001", "contract-2026-002") as RawSourceText,
    };

    await application.ingestGovernmentContractFixture(
      fictionalGovernmentContractFixture,
    );
    const conflictOutcome = await application.ingestGovernmentContractFixture(
      conflictingFixture,
    );

    expect(conflictOutcome).toEqual({
      status: "rejected",
      reason: "source_identity_conflict",
    });
    expect(application.inspectInMemoryPersistence()).toEqual({
      companyCount: 1,
      sourceCount: 1,
      signalCount: 1,
    });
  });

  it("normalizes safe URL variants without dropping query identity", async () => {
    const application = createGovernmentContractFixtureApplication({
      companies: [existingFixtureCompany],
    });
    const firstFixture = {
      ...fictionalGovernmentContractFixture,
      source: {
        ...fictionalGovernmentContractFixture.source,
        url: "HTTPS://CONTRACTS.EXAMPLE:443/notices/contract-2026-001/?notice=001#details",
      },
    };
    const normalizedReplay = {
      ...fictionalGovernmentContractFixture,
      source: {
        ...fictionalGovernmentContractFixture.source,
        id: "source:url-replay" as SourceId,
        url: "https://contracts.example/notices/contract-2026-001?notice=001",
      },
    };
    const differentQuery = {
      ...fictionalGovernmentContractFixture,
      source: {
        ...fictionalGovernmentContractFixture.source,
        id: "source:different-query" as SourceId,
        url: "https://contracts.example/notices/contract-2026-001?notice=002",
      },
    };

    await application.ingestGovernmentContractFixture(firstFixture);
    const replayOutcome = await application.ingestGovernmentContractFixture(
      normalizedReplay,
    );
    const differentQueryOutcome =
      await application.ingestGovernmentContractFixture(differentQuery);

    expect(replayOutcome).toMatchObject({
      status: "accepted",
      disposition: "already_processed",
      sourceId: fictionalGovernmentContractFixture.source.id,
    });
    expect(differentQueryOutcome).toMatchObject({
      status: "accepted",
      disposition: "created",
      sourceId: differentQuery.source.id,
    });
    expect(application.inspectInMemoryPersistence()).toEqual({
      companyCount: 1,
      sourceCount: 2,
      signalCount: 2,
    });
  });

  it("rejects a malformed external reference before persistence", async () => {
    const application = createGovernmentContractFixtureApplication({
      companies: [existingFixtureCompany],
    });
    const malformedFixture = {
      ...fictionalGovernmentContractFixture,
      rawText: fictionalGovernmentContractFixture.rawText.replace(
        "contract-2026-001",
        "   ",
      ) as RawSourceText,
    };

    const outcome = await application.ingestGovernmentContractFixture(
      malformedFixture,
    );

    expect(outcome).toEqual({
      status: "rejected",
      reason: "invalid_external_reference",
    });
    expect(application.inspectInMemoryPersistence()).toEqual({
      companyCount: 1,
      sourceCount: 0,
      signalCount: 0,
    });
  });
});
