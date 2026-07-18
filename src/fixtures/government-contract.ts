import type { Company, CompanyId } from "../packages/entity-resolver/index.js";
import type { RawSourceText } from "../packages/privacy-gateway/index.js";
import type {
  GovernmentContractFixture,
  SourceId,
} from "../packages/signal-ingestion/index.js";

export const existingFixtureCompany: Company = {
  id: "company:northstar-civic" as CompanyId,
  canonicalName: "Northstar Civic Systems",
  canonicalDomain: "northstar-civic.example",
  jurisdiction: "CA-ON",
};

const privacySafeSourceDocument = JSON.stringify({
  companyName: "Northstar Civic Systems",
  companyDomain: "northstar-civic.example",
  jurisdiction: "CA-ON",
  contractType: "professional_services",
  observedAt: "2026-06-30",
  confidence: 0.98,
  schemaVersion: "government-contract-signal/v1",
});

export const fictionalGovernmentContractFixture: GovernmentContractFixture = {
  source: {
    id: "source:contract-2026-001" as SourceId,
    name: "Canadian Public Procurement Fixture",
    url: "https://contracts.example/notices/contract-2026-001",
  },
  observedAt: "2026-06-30",
  rawText: privacySafeSourceDocument as RawSourceText,
};
