import type { SupabaseClient } from "../database/index.js";
import { createPrivacyGateway, type SanitizedCorporateText } from "../privacy-gateway/index.js";
import type { CompanyEvidenceQuery } from "./company-evidence.js";
import type {
  GovernmentContractFixture,
  IngestionOutcome,
  OfferingApplyOutcome,
  OfferingProposalDecisionInput,
  OfferingProposalOutcome,
  ProductEvidenceInput,
  ReviewQueueQuery,
} from "./index.js";
import { createSupabaseEntityResolver } from "./lib/supabase-entity-resolver.js";
import { createSupabaseGovernmentContractIngestionService } from "./lib/supabase-ingestion-service.js";
import { createOfferingIngestionService } from "./lib/offering-ingestion.js";
import { createSupabaseCompanyEvidenceQuery } from "./lib/supabase-company-evidence.js";

export type DurableApplicationClients = {
  publicClient: SupabaseClient;
  ingestionClient: SupabaseClient;
};

export type DurableGovernmentContractFixtureApplication = {
  ingestGovernmentContractFixture(
    fixture: GovernmentContractFixture,
  ): Promise<IngestionOutcome>;
  companyEvidenceQuery: CompanyEvidenceQuery;
  reviewQueueQuery: ReviewQueueQuery;
  proposeOffering(input: ProductEvidenceInput): Promise<OfferingProposalOutcome>;
  approveOffering(input: OfferingProposalDecisionInput): Promise<"approved" | "applied">;
  rejectOffering(input: OfferingProposalDecisionInput): Promise<"rejected" | "applied" | "approved">;
  applyOffering(proposalId: string): Promise<OfferingApplyOutcome>;
};

export function createDurableGovernmentContractFixtureApplication(
  clients: DurableApplicationClients,
): DurableGovernmentContractFixtureApplication {
  const privacyGateway = createPrivacyGateway();
  const entityResolver = createSupabaseEntityResolver(clients.ingestionClient);
  const signalIngestionService =
    createSupabaseGovernmentContractIngestionService(clients.ingestionClient, entityResolver);
  const offeringIngestionService = createOfferingIngestionService(clients.ingestionClient, entityResolver);
  const companyEvidenceQuery = createSupabaseCompanyEvidenceQuery(clients.publicClient);

  return {
    companyEvidenceQuery,
    reviewQueueQuery: {
      list: async () => [],
    },
    proposeOffering(input) {
      return offeringIngestionService.propose(input);
    },
    approveOffering(input) {
      return offeringIngestionService.approve(input);
    },
    rejectOffering(input) {
      return offeringIngestionService.reject(input);
    },
    applyOffering(proposalId) {
      return offeringIngestionService.apply(proposalId);
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
