import type { SupabaseClient } from "../../database/index.js";
import type { Company, CompanyId } from "../../entity-resolver/index.js";
import type {
  CompanyEvidenceQuery,
  CompanyProfile,
  CompanySearchQuery,
  CompanySearchResult,
  GovernmentContractEvidence,
  Product,
  Service,
} from "../company-evidence.js";
import type { SignalId, SourceId } from "../index.js";

type PublicCompanyProfileRow = {
  canonical_name: string;
  canonical_domain: string | null;
  jurisdiction: string | null;
  status?: string;
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

type OfferingRow = {
  kind: "product" | "service";
  offering_name: string;
  description: string | null;
  status: "active" | "unknown";
  first_observed_at: string | null;
  last_observed_at: string | null;
  signal_type: "product_added" | "service_added" | "product_changed" | "service_changed" | null;
  observed_date: string | null;
  confidence_score: number | null;
  evidence_type: Product["evidence"][number]["evidenceType"] | null;
  source_name: string | null;
  source_url: string | null;
};

class SupabaseCompanyEvidenceQuery implements CompanyEvidenceQuery, CompanySearchQuery {
  constructor(private readonly client: SupabaseClient) {}

  async searchCompanies(query: string): Promise<ReadonlyArray<CompanySearchResult>> {
    const normalizedQuery = query.trim();
    if (normalizedQuery === "") {
      return [];
    }
    const nameResult = await this.client
      .from("public_company_profiles")
      .select("canonical_name, canonical_domain, jurisdiction, status")
      .ilike("canonical_name", `%${normalizedQuery}%`)
      .limit(25);
    if (nameResult.error) {
      throw new Error(`Company search failed: ${nameResult.error.message}`);
    }
    const domainResult = await this.client
      .from("public_company_profiles")
      .select("canonical_name, canonical_domain, jurisdiction, status")
      .eq("canonical_domain", normalizedQuery.toLowerCase())
      .limit(25);
    if (domainResult.error) {
      throw new Error(`Company domain search failed: ${domainResult.error.message}`);
    }
    const rows = new Map<string, PublicCompanyProfileRow>();
    for (const row of [...(nameResult.data ?? []), ...(domainResult.data ?? [])] as PublicCompanyProfileRow[]) {
      rows.set(row.canonical_domain ?? row.canonical_name, row);
    }
    const results: CompanySearchResult[] = [];
    for (const row of rows.values()) {
      const evidenceQuery = await this.client
        .from("public_company_evidence")
        .select("observed_date")
        .eq("canonical_domain", row.canonical_domain ?? "");
      if (evidenceQuery.error) {
        throw new Error(`Company evidence count failed: ${evidenceQuery.error.message}`);
      }
      const offeringQuery = await this.client
        .from("public_company_offerings")
        .select("offering_name")
        .eq("canonical_domain", row.canonical_domain ?? "");
      if (offeringQuery.error) {
        throw new Error(`Company offering count failed: ${offeringQuery.error.message}`);
      }
      const observedDates = (evidenceQuery.data ?? [])
        .map((item) => item.observed_date)
        .filter((date): date is string => typeof date === "string")
        .sort();
      results.push({
        company: {
          canonicalName: row.canonical_name,
          canonicalDomain: row.canonical_domain ?? "",
          jurisdiction: row.jurisdiction ?? "",
        },
        evidenceCount: evidenceQuery.data?.length ?? 0,
        offeringCount: offeringQuery.data?.length ?? 0,
        ...(observedDates.at(-1) === undefined ? {} : { latestObservedAt: observedDates.at(-1) }),
      });
    }
    return results;
  }

  async findCompanyProfile(
    companyId: CompanyId,
  ): Promise<CompanyProfile | null> {
    const { data: companyData, error: companyError } = await this.client
      .rpc("public_company_profile_by_id", { candidate_company_id: companyId })
      .maybeSingle();

    if (companyError) {
      throw new Error(
        `Company query failed: ${companyError.message}`,
      );
    }
    if (companyData === null) {
      return null;
    }

    const companyRow = companyData as PublicCompanyProfileRow;
    const company: Company = {
      id: companyId,
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

    const { data: offeringData, error: offeringError } = await this.client
      .from("public_company_offerings")
      .select("kind, offering_name, description, status, first_observed_at, last_observed_at, signal_type, observed_date, confidence_score, evidence_type, source_name, source_url")
      .eq("canonical_domain", company.canonicalDomain);

    if (offeringError) {
      throw new Error(`Offering query failed: ${offeringError.message}`);
    }

    const offeringRows = (offeringData ?? []) as OfferingRow[];
    const products = new Map<string, Product>();
    const services = new Map<string, Service>();
    for (const row of offeringRows) {
      const target = row.kind === "product" ? products : services;
      const key = `${row.kind}:${row.offering_name}`;
      const existing = target.get(key);
      const nextEvidence = row.signal_type === null || row.observed_date === null || row.confidence_score === null || row.evidence_type === null || row.source_name === null || row.source_url === null
        ? existing?.evidence ?? []
        : [...(existing?.evidence ?? []), {
            signalId: "" as SignalId,
            signalType: row.signal_type,
            observedAt: row.observed_date,
            evidenceType: row.evidence_type,
            confidence: row.confidence_score,
            source: { id: "" as SourceId, name: row.source_name, url: row.source_url },
          }];
      const offering = {
        kind: row.kind,
        name: row.offering_name,
        ...(row.description === null ? {} : { description: row.description }),
        status: row.status,
        ...(row.first_observed_at === null ? {} : { firstObservedAt: row.first_observed_at }),
        ...(row.last_observed_at === null ? {} : { lastObservedAt: row.last_observed_at }),
        evidence: nextEvidence,
      };
      if (row.kind === "product") {
        products.set(key, offering as Product);
      } else {
        services.set(key, offering as Service);
      }
    }

    return { company, products: [...products.values()] as Product[], services: [...services.values()] as Service[], evidence };
  }
}

export function createSupabaseCompanyEvidenceQuery(
  client: SupabaseClient,
): CompanyEvidenceQuery {
  return new SupabaseCompanyEvidenceQuery(client);
}

export function createSupabaseCompanySearchQuery(
  client: SupabaseClient,
): CompanySearchQuery {
  return new SupabaseCompanyEvidenceQuery(client);
}
