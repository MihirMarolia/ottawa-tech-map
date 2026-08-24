import { describe, expect, it, beforeAll } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createDurableIntegrationClientsFromEnvironment } from "../packages/database/index.js";
import { randomUUID } from "node:crypto";
import { createDurableGovernmentContractFixtureApplication } from "../packages/signal-ingestion/durable-application.js";
import type { RawSourceText } from "../packages/privacy-gateway/index.js";
import type { SourceId } from "../packages/signal-ingestion/index.js";
import type { CompanyProfile, GovernmentContractEvidence } from "../packages/signal-ingestion/company-evidence.js";

function skipIfNoCredentials(): boolean {
  return createDurableIntegrationClientsFromEnvironment() === null;
}

const FIXTURE_DOMAIN = "northstar-civic.example";
const FIXTURE_COMPANY_NAME = "Northstar Civic Systems";
const FIXTURE_JURISDICTION = "CA-ON";
const FIXTURE_CONFIDENCE = 0.98;
const FIXTURE_SCHEMA_VERSION = "government-contract-signal/v1";
const FIXTURE_OBSERVED_AT = "2026-06-30";
const FIXTURE_SOURCE_NAME = "Canadian Public Procurement Fixture";

/**
 * Each test run gets a unique external reference and source URL so that
 * tests create their own isolated data. This avoids the need for destructive
 * cleanup and preserves the append-only audit_events invariant.
 *
 * The fingerprint includes the external reference, so unique external
 * references produce unique signal fingerprints — each run starts fresh.
 */
function makeUniqueFixture(): {
  fixture: ReturnType<typeof makeFixtureObject>;
  externalRef: string;
  sourceUrl: string;
} {
  const runId = randomUUID().slice(0, 8);
  const externalRef = `contract-test-${runId}`;
  const sourceUrl = `https://contracts.example/notices/${externalRef}`;

  return {
    externalRef,
    sourceUrl,
    fixture: makeFixtureObject(externalRef, sourceUrl),
  };
}

function makeFixtureObject(externalRef: string, sourceUrl: string): {
  source: { id: SourceId; name: string; url: string };
  observedAt: string;
  rawText: RawSourceText;
} {
  const rawText = JSON.stringify({
    companyName: FIXTURE_COMPANY_NAME,
    companyDomain: FIXTURE_DOMAIN,
    jurisdiction: FIXTURE_JURISDICTION,
    contractType: "professional_services",
    observedAt: FIXTURE_OBSERVED_AT,
    confidence: FIXTURE_CONFIDENCE,
    schemaVersion: FIXTURE_SCHEMA_VERSION,
    externalReference: externalRef,
  }) as RawSourceText;

  return {
    source: {
      id: `source:${externalRef}` as SourceId,
      name: FIXTURE_SOURCE_NAME,
      url: sourceUrl,
    },
    observedAt: FIXTURE_OBSERVED_AT,
    rawText,
  };
}

/** Filter evidence to only entries from the current test run. */
function evidenceForRun(
  profile: CompanyProfile | null,
  sourceUrl: string,
): GovernmentContractEvidence[] {
  if (profile === null) return [];
  return profile.evidence.filter((e) => e.source.url === sourceUrl);
}

describe("durable Supabase integration — government contract ingestion", () => {
  let publicClient: SupabaseClient;
  let ingestionClient: SupabaseClient;

  beforeAll(() => {
    const clients = createDurableIntegrationClientsFromEnvironment();
    if (clients === null) {
      return;
    }
    publicClient = clients.publicClient;
    ingestionClient = clients.ingestionClient;
  });

  function createApplication() {
    return createDurableGovernmentContractFixtureApplication({
      publicClient,
      ingestionClient,
    });
  }

  it.skipIf(skipIfNoCredentials())(
    "accepted ingestion: persists via RPC and maps to domain result",
    async () => {
      const { fixture, sourceUrl } = makeUniqueFixture();
      const app = createApplication();

      const outcome = await app.ingestGovernmentContractFixture(fixture);

      expect(outcome.status).toBe("accepted");
      if (outcome.status !== "accepted") return;

      expect(outcome.disposition).toBe("created");
      expect(outcome.companyId).toBeTruthy();
      expect(outcome.sourceId).toBeTruthy();
      expect(outcome.signalId).toBeTruthy();

      // Company ID should be a real UUID from the database
      expect(outcome.companyId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );

      // Verify evidence was persisted and is retrievable
      const profile = await app.companyEvidenceQuery.findCompanyProfile(
        outcome.companyId,
      );
      const runEvidence = evidenceForRun(profile, sourceUrl);
      expect(runEvidence).toHaveLength(1);
    },
    30000,
  );

  it.skipIf(skipIfNoCredentials())(
    "replay/idempotency: second submission returns already_processed with no duplicate",
    async () => {
      const { fixture, sourceUrl } = makeUniqueFixture();
      const app = createApplication();

      const first = await app.ingestGovernmentContractFixture(fixture);
      const second = await app.ingestGovernmentContractFixture(fixture);

      expect(first.status).toBe("accepted");
      expect(second.status).toBe("accepted");
      if (first.status !== "accepted" || second.status !== "accepted") return;

      expect(first.disposition).toBe("created");
      expect(second.disposition).toBe("already_processed");

      expect(second.signalId).toBe(first.signalId);
      expect(second.sourceId).toBe(first.sourceId);
      expect(second.companyId).toBe(first.companyId);

      // Verify exactly one evidence entry for this run — no duplicate
      const profile = await app.companyEvidenceQuery.findCompanyProfile(
        first.companyId,
      );
      const runEvidence = evidenceForRun(profile, sourceUrl);
      expect(runEvidence).toHaveLength(1);
    },
    30000,
  );

  it.skipIf(skipIfNoCredentials())(
    "evidence query: retrieves persisted company/signal/source data with provenance intact",
    async () => {
      const { fixture, sourceUrl } = makeUniqueFixture();
      const app = createApplication();

      const outcome = await app.ingestGovernmentContractFixture(fixture);
      expect(outcome.status).toBe("accepted");
      if (outcome.status !== "accepted") return;

      const profile = await app.companyEvidenceQuery.findCompanyProfile(
        outcome.companyId,
      );

      expect(profile).not.toBeNull();
      if (profile === null) return;

      expect(profile.company.canonicalName).toBe(FIXTURE_COMPANY_NAME);
      expect(profile.company.canonicalDomain).toBe(FIXTURE_DOMAIN);
      expect(profile.company.jurisdiction).toBe(FIXTURE_JURISDICTION);

      const runEvidence = evidenceForRun(profile, sourceUrl);
      expect(runEvidence).toHaveLength(1);
      const evidence = runEvidence[0];
      expect(evidence.signalType).toBe("government_contract_awarded");
      expect(evidence.contractType).toBe("professional_services");
      expect(evidence.observedAt).toBe(FIXTURE_OBSERVED_AT);
      expect(evidence.confidence).toBeCloseTo(FIXTURE_CONFIDENCE, 2);
      expect(evidence.schemaVersion).toBe(FIXTURE_SCHEMA_VERSION);
      expect(evidence.source.name).toBe(FIXTURE_SOURCE_NAME);
      expect(evidence.source.url).toBe(sourceUrl);
    },
    30000,
  );

  it.skipIf(skipIfNoCredentials())(
    "concurrency: 8-way parallel ingestion converges to a single canonical record",
    async () => {
      const { fixture, sourceUrl } = makeUniqueFixture();
      const app = createApplication();

      const outcomes = await Promise.all(
        Array.from({ length: 8 }, () =>
          app.ingestGovernmentContractFixture(fixture),
        ),
      );

      for (const outcome of outcomes) {
        expect(outcome.status).toBe("accepted");
      }

      const accepted = outcomes.filter(
        (o): o is Extract<typeof o, { status: "accepted" }> =>
          o.status === "accepted",
      );

      const created = accepted.filter((o) => o.disposition === "created");
      const replayed = accepted.filter(
        (o) => o.disposition === "already_processed",
      );
      expect(created).toHaveLength(1);
      expect(replayed).toHaveLength(7);

      const signalIds = new Set(accepted.map((o) => o.signalId));
      const sourceIds = new Set(accepted.map((o) => o.sourceId));
      expect(signalIds.size).toBe(1);
      expect(sourceIds.size).toBe(1);

      // Verify exactly one evidence entry for this run — no duplicate from concurrency
      const profile = await app.companyEvidenceQuery.findCompanyProfile(
        accepted[0].companyId,
      );
      const runEvidence = evidenceForRun(profile, sourceUrl);
      expect(runEvidence).toHaveLength(1);
    },
    60000,
  );

  it.skipIf(skipIfNoCredentials())(
    "replay with different source ID still deduplicates by fingerprint",
    async () => {
      const { fixture, externalRef } = makeUniqueFixture();
      const app = createApplication();

      const first = await app.ingestGovernmentContractFixture(fixture);

      const replayFixture = {
        ...fixture,
        source: {
          ...fixture.source,
          id: `source:replay-${externalRef}` as SourceId,
        },
      };
      const replay = await app.ingestGovernmentContractFixture(replayFixture);

      expect(first.status).toBe("accepted");
      expect(replay.status).toBe("accepted");
      if (first.status !== "accepted" || replay.status !== "accepted") return;

      expect(first.disposition).toBe("created");
      expect(replay.disposition).toBe("already_processed");

      // Same signal ID — RPC deduplicates by fingerprint, not source ID
      expect(replay.signalId).toBe(first.signalId);
    },
    30000,
  );

  it.skipIf(skipIfNoCredentials())(
    "rejects invalid source document without persisting anything",
    async () => {
      const { fixture, sourceUrl } = makeUniqueFixture();
      const app = createApplication();

      const invalidFixture = {
        ...fixture,
        rawText: '{"notValid":true}' as RawSourceText,
      };

      const outcome = await app.ingestGovernmentContractFixture(invalidFixture);

      expect(outcome).toEqual({
        status: "rejected",
        reason: "invalid_source_document",
      });

      // Verify nothing was persisted for this run — query the evidence view
      // and filter by the unique source URL. No matching evidence should exist.
      const { data, error } = await publicClient
        .from("public_company_evidence")
        .select("source_url")
        .eq("source_url", sourceUrl);

      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    },
    30000,
  );
});
