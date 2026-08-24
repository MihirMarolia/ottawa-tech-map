import type { SupabaseClient } from "../../database/index.js";
import type {
  Company,
  CompanyId,
  CompanyReference,
  EntityResolutionResult,
  EntityResolver,
} from "../../entity-resolver/index.js";

type CompanyRow = {
  id: string;
  canonical_name: string;
  canonical_domain: string | null;
  jurisdiction: string | null;
  status: string;
};

function toCompany(row: CompanyRow): Company {
  return {
    id: row.id as CompanyId,
    canonicalName: row.canonical_name,
    canonicalDomain: row.canonical_domain ?? "",
    jurisdiction: row.jurisdiction ?? "",
  };
}

class SupabaseEntityResolver implements EntityResolver {
  constructor(private readonly client: SupabaseClient) {}

  async resolve(
    input: CompanyReference,
  ): Promise<EntityResolutionResult> {
    const { data, error } = await this.client
      .from("companies")
      .select("id, canonical_name, canonical_domain, jurisdiction, status")
      .eq("canonical_domain", input.observedDomain)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      throw new Error(`Entity resolution query failed: ${error.message}`);
    }

    if (data === null) {
      return {
        status: "new_company",
        proposedCompany: {
          observedName: input.observedName ?? input.observedDomain,
          observedDomain: input.observedDomain,
          jurisdiction: input.jurisdiction,
        },
      };
    }

    const company = toCompany(data as CompanyRow);

    if (input.observedName !== undefined && company.canonicalName !== input.observedName) {
      return {
        status: "review_required",
        reason: "conflicting_evidence",
        candidates: [
          {
            companyId: company.id,
            observedName: company.canonicalName,
            observedDomain: company.canonicalDomain,
            confidence: 1,
          },
        ],
      };
    }

    return {
      status: "resolved",
      companyId: company.id,
      resolutionMethod: "canonical_domain",
      confidence: 1,
    };
  }
}

export function createSupabaseEntityResolver(
  client: SupabaseClient,
): EntityResolver {
  return new SupabaseEntityResolver(client);
}

export function toCompanyFromRow(row: CompanyRow): Company {
  return toCompany(row);
}

export type { CompanyRow };
