import { describe, expect, it } from "vitest";
import type { Company, CompanyId } from "../packages/entity-resolver/index.js";
import type { RawSourceText } from "../packages/privacy-gateway/index.js";
import type { SourceId } from "../packages/signal-ingestion/index.js";
import { createSupabaseGovernmentContractFixtureApplication, GovernmentContractPersistenceError } from "../packages/signal-ingestion/supabase-government-contract-application.js";

const integrationEnvironment =
  process.env.SUPABASE_INTEGRATION_URL !== undefined &&
  process.env.SUPABASE_INTEGRATION_SERVICE_ROLE_KEY !== undefined;

describe.skipIf(!integrationEnvironment)(
  "Supabase government-contract ingestion integration",
  () => {
    it("persists the accepted path through the RPC and replays with stable canonical identities", async () => {
      const company: Company = {
        id: "60000000-0000-0000-0000-000000000001" as CompanyId,
        canonicalName: "Northstar Civic Systems",
        canonicalDomain: "northstar-civic.example",
        jurisdiction: "CA-ON",
      };
      const application = createSupabaseGovernmentContractFixtureApplication({
        companies: [company],
        supabaseUrl: process.env.SUPABASE_INTEGRATION_URL!,
        serviceRoleKey: process.env.SUPABASE_INTEGRATION_SERVICE_ROLE_KEY!,
      });
      const fixture = {
        source: {
          id: "caller:contract-2026-001" as SourceId,
          name: "Canadian Public Procurement Fixture",
          url: "https://contracts.example/notices/contract-2026-001",
        },
        observedAt: "2026-06-30",
        rawText: JSON.stringify({
          companyName: "Northstar Civic Systems",
          companyDomain: "northstar-civic.example",
          jurisdiction: "CA-ON",
          contractType: "professional_services",
          observedAt: "2026-06-30",
          confidence: 0.98,
          schemaVersion: "government-contract-signal/v1",
          externalReference: "contract-2026-001",
        }) as RawSourceText,
      };

      const first = await application.ingestGovernmentContractFixture(fixture);
      const replay = await application.ingestGovernmentContractFixture(fixture);

      expect(first).toMatchObject({
        status: "accepted",
        disposition: "created",
        companyId: company.id,
      });
      expect(replay).toEqual(
        first.status === "accepted"
          ? { ...first, disposition: "already_processed" }
          : first,
      );
      if (first.status !== "accepted") {
        throw new Error("Expected accepted ingestion");
      }
      expect(first.sourceId).not.toBe(fixture.source.id);

      const profile = await application.companyEvidenceQuery.findCompanyProfile(
        company.id,
      );
      expect(profile).toEqual({
        company,
        evidence: [
          {
            signalId: first.signalId,
            signalType: "government_contract_awarded",
            contractType: "professional_services",
            observedAt: "2026-06-30",
            confidence: 0.98,
            schemaVersion: "government-contract-signal/v1",
            source: {
              id: first.sourceId,
              name: fixture.source.name,
              url: fixture.source.url,
            },
          },
        ],
      });
    });

    it("records a privacy-safe technical failure in a recovery transaction", async () => {
      const databaseMissingCompany: Company = {
        id: "60000000-0000-0000-0000-000000000099" as CompanyId,
        canonicalName: "Missing Database Company",
        canonicalDomain: "missing-company.example",
        jurisdiction: "CA-ON",
      };
      const application = createSupabaseGovernmentContractFixtureApplication({
        companies: [databaseMissingCompany],
        supabaseUrl: process.env.SUPABASE_INTEGRATION_URL!,
        serviceRoleKey: process.env.SUPABASE_INTEGRATION_SERVICE_ROLE_KEY!,
      });

      await expect(
        application.ingestGovernmentContractFixture({
          source: {
            id: "caller:missing-company" as SourceId,
            name: "Technical Failure Fixture",
            url: "https://contracts.example/notices/missing-company",
          },
          observedAt: "2026-07-01",
          rawText: JSON.stringify({
            companyName: databaseMissingCompany.canonicalName,
            companyDomain: databaseMissingCompany.canonicalDomain,
            jurisdiction: databaseMissingCompany.jurisdiction,
            contractType: "professional_services",
            observedAt: "2026-07-01",
            confidence: 0.9,
            schemaVersion: "government-contract-signal/v1",
            externalReference: "missing-company-contract",
          }) as RawSourceText,
        }),
      ).rejects.toEqual(
        expect.objectContaining<Partial<GovernmentContractPersistenceError>>({
          name: "GovernmentContractPersistenceError",
          category: "constraint_violation",
        }),
      );
    });
  },
);
