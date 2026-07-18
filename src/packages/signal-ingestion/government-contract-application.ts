import type { Company } from "../entity-resolver/index.js";
import { createExactCanonicalDomainEntityResolver } from "../entity-resolver/index.js";
import {
  createPrivacyGateway,
  type SanitizedCorporateText,
} from "../privacy-gateway/index.js";
import type { CompanyEvidenceQuery } from "./company-evidence.js";
import type { GovernmentContractFixture, IngestionOutcome } from "./index.js";
import {
  createCompanyEvidenceQuery,
  createInMemoryRepositories,
  type InMemoryRepositories,
} from "./lib/in-memory-repositories.js";
import { createGovernmentContractSignalIngestionService } from "./lib/government-contract-signal-ingestion-service.js";

export type GovernmentContractFixtureApplication = {
  ingestGovernmentContractFixture(
    fixture: GovernmentContractFixture,
  ): Promise<IngestionOutcome>;
  companyEvidenceQuery: CompanyEvidenceQuery;
};

export function createGovernmentContractFixtureApplication(input: {
  companies: ReadonlyArray<Company>;
}): GovernmentContractFixtureApplication {
  const repositories = createInMemoryRepositories(input.companies);
  const privacyGateway = createPrivacyGateway();
  const entityResolver = createExactCanonicalDomainEntityResolver(
    repositories.companies.all(),
  );
  const signalIngestionService =
    createGovernmentContractSignalIngestionService(
      entityResolver,
      repositories,
    );

  return {
    companyEvidenceQuery: createCompanyEvidenceQuery(repositories),
    async ingestGovernmentContractFixture(fixture) {
      const sanitizationResult = privacyGateway.sanitize({
        rawText: fixture.rawText,
        sourceUrl: fixture.source.url,
      });

      let sanitizedText: SanitizedCorporateText;
      try {
        sanitizedText = privacyGateway.assertSafe(sanitizationResult);
      } catch {
        return { status: "rejected", reason: "privacy_rejected" };
      }

      return signalIngestionService.ingest({
        sourceId: fixture.source.id,
        sourceName: fixture.source.name,
        sourceUrl: fixture.source.url,
        observedAt: fixture.observedAt,
        sanitizedText,
      });
    },
  };
}
