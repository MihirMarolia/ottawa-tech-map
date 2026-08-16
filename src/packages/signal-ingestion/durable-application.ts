import type { SupabaseClient } from "../database/index.js";
import { createPrivacyGateway, type SanitizedCorporateText } from "../privacy-gateway/index.js";
import type { CompanyEvidenceQuery } from "./company-evidence.js";
import type {
  GovernmentContractFixture,
  IngestionOutcome,
  ReviewQueueQuery,
} from "./index.js";
import { createSupabaseEntityResolver } from "./lib/supabase-entity-resolver.js";
import { createSupabaseGovernmentContractIngestionService } from "./lib/supabase-ingestion-service.js";
import { createSupabaseCompanyEvidenceQuery } from "./lib/supabase-company-evidence.js";

export type DurableGovernmentContractFixtureApplication = {
  ingestGovernmentContractFixture(
    fixture: GovernmentContractFixture,
  ): Promise<IngestionOutcome>;
  companyEvidenceQuery: CompanyEvidenceQuery;
  reviewQueueQuery: ReviewQueueQuery;
};

export function createDurableGovernmentContractFixtureApplication(
  client: SupabaseClient,
): DurableGovernmentContractFixtureApplication {
  const privacyGateway = createPrivacyGateway();
  const entityResolver = createSupabaseEntityResolver(client);
  const signalIngestionService =
    createSupabaseGovernmentContractIngestionService(client, entityResolver);
  const companyEvidenceQuery = createSupabaseCompanyEvidenceQuery(client);

  return {
    companyEvidenceQuery,
    reviewQueueQuery: {
      list: async () => [],
    },
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
