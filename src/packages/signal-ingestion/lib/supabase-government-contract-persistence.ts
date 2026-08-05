import { createHash, randomUUID } from "node:crypto";
import type { Company, CompanyId } from "../../entity-resolver/index.js";
import {
  DatabaseRpcError,
  type AdminDatabaseRpcClient,
} from "../../database/admin.js";
import type { CompanyEvidenceQuery } from "../company-evidence.js";
import type {
  AcceptedIngestionOutcome,
  SignalId,
  SourceId,
} from "../index.js";
import type {
  GovernmentContractAcceptedPersistence,
  GovernmentContractPersistenceInput,
} from "./government-contract-signal-ingestion-service.js";

type PersistenceRow = {
  outcome: "accepted_created" | "accepted_already_processed";
  source_id: string;
  signal_id: string;
};

type EvidenceRow = {
  signal_id: string;
  source_id: string;
  source_name: string;
  source_url: string;
  observed_date: string;
  confidence_score: number;
  schema_version: "government-contract-signal/v1";
  contract_type: "professional_services";
};

function fingerprintCanonicalInput(
  input: GovernmentContractPersistenceInput,
): string {
  return JSON.stringify({
    externalReference: input.sourceDocument.externalReference,
    observedDate: input.sourceDocument.observedAt,
    signalDiscriminator: input.sourceDocument.externalReference,
    signalType: "government_contract_awarded",
    sourceIdentity: `${input.normalizedSourceUrl}|${input.source.contentHash}`,
  });
}

export class GovernmentContractPersistenceError extends Error {
  constructor(readonly category: DatabaseRpcError["category"]) {
    super(`Government-contract persistence failed: ${category}`);
    this.name = "GovernmentContractPersistenceError";
  }
}

export function createSupabaseGovernmentContractPersistence(
  client: AdminDatabaseRpcClient,
): GovernmentContractAcceptedPersistence {
  return {
    async persist(input): Promise<AcceptedIngestionOutcome> {
      const ingestionRunId = randomUUID();
      const correlationId = randomUUID();
      const itemKey = `government-contract:${input.source.contentHash}:${input.sourceDocument.externalReference}`;
      const canonicalInput = fingerprintCanonicalInput(input);
      const fingerprint = createHash("sha256")
        .update(canonicalInput, "utf8")
        .digest("hex");
      const parameters = {
        candidate_ingestion_run_id: ingestionRunId,
        candidate_item_key: itemKey,
        candidate_correlation_id: correlationId,
        candidate_company_id: input.companyId,
        candidate_source_name: input.source.name,
        candidate_source_url: input.source.url,
        candidate_normalized_url: input.normalizedSourceUrl,
        candidate_content_hash: input.source.contentHash,
        candidate_observed_date: input.sourceDocument.observedAt,
        candidate_external_reference: input.sourceDocument.externalReference,
        candidate_signal_discriminator: input.sourceDocument.externalReference,
        candidate_fingerprint_version: 1,
        candidate_fingerprint_canonical_input: canonicalInput,
        candidate_signal_fingerprint: fingerprint,
        candidate_structured_payload: {
          contractType: input.sourceDocument.contractType,
          observedAt: input.sourceDocument.observedAt,
        },
        candidate_confidence_score: input.sourceDocument.confidence,
        candidate_schema_version: input.sourceDocument.schemaVersion,
      };

      let rows: ReadonlyArray<PersistenceRow>;
      try {
        rows = await client.call<ReadonlyArray<PersistenceRow>>(
          "persist_government_contract_application_item",
          parameters,
        );
      } catch (error) {
        const databaseError =
          error instanceof DatabaseRpcError
            ? error
            : new DatabaseRpcError(
                "Unexpected persistence adapter failure",
                "unexpected_internal_error",
              );
        try {
          if (!databaseError.recoveryEligible) throw databaseError;
          await client.call<ReadonlyArray<unknown>>(
            "record_government_contract_item_failure",
            {
              candidate_ingestion_run_id: ingestionRunId,
              candidate_item_key: itemKey,
              candidate_correlation_id: correlationId,
              candidate_failure_category: databaseError.category,
            },
          );
        } catch {
          // Recovery is best-effort when the database itself is unavailable.
        }
        throw new GovernmentContractPersistenceError(databaseError.category);
      }

      const row = rows[0];
      if (
        row === undefined ||
        rows.length !== 1 ||
        (row.outcome !== "accepted_created" &&
          row.outcome !== "accepted_already_processed") ||
        typeof row.source_id !== "string" ||
        typeof row.signal_id !== "string"
      ) {
        throw new GovernmentContractPersistenceError(
          "function_contract_violation",
        );
      }
      return {
        status: "accepted",
        disposition:
          row.outcome === "accepted_created" ? "created" : "already_processed",
        companyId: input.companyId,
        sourceId: row.source_id as SourceId,
        signalId: row.signal_id as SignalId,
      };
    },
  };
}

export function createSupabaseCompanyEvidenceQuery(input: {
  client: AdminDatabaseRpcClient;
  companies: ReadonlyArray<Company>;
}): CompanyEvidenceQuery {
  return {
    async findCompanyProfile(companyId: CompanyId) {
      const company = input.companies.find((candidate) => candidate.id === companyId);
      if (company === undefined) {
        return null;
      }
      const rows = await input.client.call<ReadonlyArray<EvidenceRow>>(
        "read_company_government_contract_evidence",
        { candidate_company_id: companyId },
      );
      return {
        company,
        evidence: rows.map((row) => ({
          signalId: row.signal_id as SignalId,
          signalType: "government_contract_awarded" as const,
          contractType: row.contract_type,
          observedAt: row.observed_date,
          confidence: Number(row.confidence_score),
          schemaVersion: row.schema_version,
          source: {
            id: row.source_id as SourceId,
            name: row.source_name,
            url: row.source_url,
          },
        })),
      };
    },
  };
}
