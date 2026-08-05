import { existingFixtureCompany } from "../fixtures/government-contract.js";
import { fictionalJobPostingFixture } from "../fixtures/job-posting.js";
import type { RawSourceText } from "../packages/privacy-gateway/index.js";
import type { SourceId } from "../packages/signal-ingestion/index.js";
import { createJobPostingFixtureApplication } from "../packages/signal-ingestion/job-posting-application.js";

describe("job-posting fixture to Company Evidence", () => {
  it("accepts, persists, presents, and deduplicates a privacy-safe posting without an external reference", async () => {
    const application = createJobPostingFixtureApplication({ companies: [existingFixtureCompany] });
    const created = await application.ingestJobPostingFixture(fictionalJobPostingFixture);
    expect(created).toMatchObject({ status: "accepted", disposition: "created", companyId: existingFixtureCompany.id });
    expect(application.inspectInMemoryPersistence()).toEqual({ companyCount: 1, sourceCount: 1, signalCount: 1, evidenceCount: 1 });

    const profile = await application.companyEvidenceQuery.findCompanyProfile(existingFixtureCompany.id);
    expect(profile?.evidence).toEqual([
      expect.objectContaining({
        signalType: "job_posting_observed",
        jobTitle: "Platform Security Engineer",
        location: "Ottawa, Ontario",
        postingDate: "2026-08-01",
        technologies: ["TypeScript", "PostgreSQL"],
        securityClearanceRequired: true,
        bilingualRequired: false,
        employmentType: "full_time",
        expansionEvidence: false,
        observedAt: "2026-08-05",
        confidence: 0.97,
        schemaVersion: "job-posting-signal/v1",
        externalReference: null,
        source: expect.objectContaining({ name: "Northstar Civic Systems careers fixture" }),
      }),
    ]);
    expect(JSON.stringify(profile)).not.toContain("rawText");

    const replay = await application.ingestJobPostingFixture({
      ...fictionalJobPostingFixture,
      source: { ...fictionalJobPostingFixture.source, id: "source:different-caller-id" as SourceId },
    });
    expect(replay).toEqual({ ...created, disposition: "already_processed" });
    expect(application.inspectInMemoryPersistence()).toEqual({ companyCount: 1, sourceCount: 1, signalCount: 1, evidenceCount: 1 });
  });

  it("returns stable canonical identities across fresh repository instances", async () => {
    const first = await createJobPostingFixtureApplication({ companies: [existingFixtureCompany] }).ingestJobPostingFixture(fictionalJobPostingFixture);
    const second = await createJobPostingFixtureApplication({ companies: [existingFixtureCompany] }).ingestJobPostingFixture({
      ...fictionalJobPostingFixture,
      source: { ...fictionalJobPostingFixture.source, id: "source:another-caller" as SourceId },
    });
    expect(second).toEqual(first);
  });

  it("rejects personal source content before persistence", async () => {
    const application = createJobPostingFixtureApplication({ companies: [existingFixtureCompany] });
    const outcome = await application.ingestJobPostingFixture({
      ...fictionalJobPostingFixture,
      rawText: '{"contact":"person@example.com"}' as RawSourceText,
    });
    expect(outcome).toEqual({ status: "rejected", reason: "privacy_rejected" });
    expect(application.inspectInMemoryPersistence().signalCount).toBe(0);
  });
});
