import { createAdminDatabaseRpcClient } from "../database/admin.js";
import type { Company } from "../entity-resolver/index.js";
import { createExactCanonicalDomainEntityResolver } from "../entity-resolver/index.js";
import {
  createPrivacyGateway,
  type SanitizedCorporateText,
} from "../privacy-gateway/index.js";
import type { GovernmentContractFixtureApplication } from "./government-contract-application.js";
import type { GovernmentContractFixture } from "./index.js";
import { InMemoryReviewQueueRepository } from "./lib/in-memory-repositories.js";
import { createGovernmentContractSignalIngestionServiceWithPersistence } from "./lib/government-contract-signal-ingestion-service.js";
import {
  createSupabaseCompanyEvidenceQuery,
  createSupabaseGovernmentContractPersistence,
} from "./lib/supabase-government-contract-persistence.js";
export { GovernmentContractPersistenceError } from "./lib/supabase-government-contract-persistence.js";


export function createSupabaseGovernmentContractFixtureApplication(input: {
  companies: ReadonlyArray<Company>;
  supabaseUrl: string;
  serviceRoleKey: string;
  fetchImplementation?: typeof fetch;
  timeoutMs?: number;
}): Omit<GovernmentContractFixtureApplication, "inspectInMemoryPersistence"> {
  const client = createAdminDatabaseRpcClient(input);
  const privacyGateway = createPrivacyGateway();
  const reviewQueue = new InMemoryReviewQueueRepository();
  const entityResolver = createExactCanonicalDomainEntityResolver(input.companies);
  const signalIngestionService =
    createGovernmentContractSignalIngestionServiceWithPersistence(
      entityResolver,
      createSupabaseGovernmentContractPersistence(client),
      reviewQueue,
    );

  return {
    companyEvidenceQuery: createSupabaseCompanyEvidenceQuery({
      client,
      companies: input.companies,
    }),
    reviewQueueQuery: { list: async () => reviewQueue.all() },
    async ingestGovernmentContractFixture(fixture: GovernmentContractFixture) {
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
