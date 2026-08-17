import type { SupabaseClient } from "../../database/index.js";
import type { Company, CompanyId } from "../../entity-resolver/index.js";
import type {
  CompanyEvidenceQuery,
  CompanyProfile,
  GovernmentContractEvidence,
} from "../company-evidence.js";
import type { SignalId, SourceId } from "../index.js";

type CompanyRow = {
  id: string;
  canonical_name: string;
  canonical_domain: string | null;
  jurisdiction: string | null;
};

type EvidenceRow = {
  company_name: string;
  canonical_domain: string | null;
  signal_type: string;
  observed_date: string;
  confidence_score: number;
  schema_version: string;
  contract_type: string;
  source_name: string;
  source_url: string;
};

class SupabaseCompanyEvidenceQuery implements CompanyEvidenceQuery {
  constructor(private readonly client: SupabaseClient) {}

  async findCompanyProfile(
    companyId: CompanyId,
  ): Promise<CompanyProfile | null> {
    const { data: companyData, error: companyError } = await this.client
      .from("companies")
      .select("id, canonical_name, canonical_domain, jurisdiction")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError) {
      throw new Error(
        `Company query failed: ${companyError.message}`,
      );
    }
    if (companyData === null) {
      return null;
    }

    const companyRow = companyData as CompanyRow;
    const company: Company = {
      id: companyRow.id as CompanyId,
      canonicalName: companyRow.canonical_name,
      canonicalDomain: companyRow.canonical_domain ?? "",
      jurisdiction: companyRow.jurisdiction ?? "",
    };

    const { data: evidenceData, error: evidenceError } = await this.client
      .from("public_company_evidence")
      .select(
        "company_name, canonical_domain, signal_type, observed_date, confidence_score, schema_version, contract_type, source_name, source_url",
      )
      .eq("canonical_domain", company.canonicalDomain);

    if (evidenceError) {
      throw new Error(
        `Evidence query failed: ${evidenceError.message}`,
      );
    }

    const evidenceRows = (evidenceData ?? []) as EvidenceRow[];
    const evidence: GovernmentContractEvidence[] = evidenceRows.map((row) => ({
      signalId: "" as SignalId,
      signalType: "government_contract_awarded",
      contractType: "professional_services",
      observedAt: row.observed_date,
      confidence: row.confidence_score,
      schemaVersion: row.schema_version as "government-contract-signal/v1",
      source: {
        id: "" as SourceId,
        name: row.source_name,
        url: row.source_url,
      },
    }));

    return { company, evidence };
  }
}

export function createSupabaseCompanyEvidenceQuery(
  client: SupabaseClient,
): CompanyEvidenceQuery {
  return new SupabaseCompanyEvidenceQuery(client);
}
