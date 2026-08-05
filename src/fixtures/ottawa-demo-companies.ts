import type { Company, CompanyId } from "../packages/entity-resolver/index.js";

const companies = [
  ["shopify", "Shopify", "shopify.com"],
  ["kinaxis", "Kinaxis", "kinaxis.com"],
  ["calian", "Calian", "calian.com"],
  ["solace", "Solace", "solace.com"],
  ["fullscript", "Fullscript", "fullscript.com"],
  ["assent", "Assent", "assent.com"],
  ["rewind", "Rewind", "rewind.com"],
  ["field-effect", "Field Effect", "fieldeffect.com"],
  ["mindbridge", "MindBridge", "mindbridge.ai"],
  ["ranovus", "RANOVUS", "ranovus.com"],
] as const;

export const reviewedOttawaDemoCompanies: ReadonlyArray<Company> = companies.map(
  ([key, canonicalName, canonicalDomain]) => ({
    id: `company:ottawa-${key}` as CompanyId,
    canonicalName,
    canonicalDomain,
    jurisdiction: "CA-ON",
  }),
);
