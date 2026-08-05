import type {
  ImportFile,
  ImportRowIssue,
  OttawaSourceManifestValidation,
  OttawaSourceProposal,
} from "../index.js";
import { parseCsv } from "./ottawa-public-data-import-service.js";

const SOURCE_COLUMNS = [
  "research_company_key",
  "source_name",
  "source_title",
  "source_url",
  "evidence_type",
  "observed_date",
  "verification_status",
  "access_restriction",
] as const;

const isDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export function validateOttawaSourceManifest(
  file: ImportFile,
  researchCompanyKeys: ReadonlySet<string>,
): OttawaSourceManifestValidation {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    throw new Error("Only CSV source manifests are supported");
  }
  const parsed = parseCsv(new TextDecoder("utf-8", { fatal: true }).decode(file.bytes));
  const missing = SOURCE_COLUMNS.filter((column) => !parsed.columns.includes(column));
  if (missing.length > 0) {
    throw new Error(`Missing Source columns: ${missing.join(", ")}`);
  }

  const records: OttawaSourceProposal[] = [];
  const issues: ImportRowIssue[] = [];
  const seenSourceUrls = new Set<string>();
  const indexOf = (column: typeof SOURCE_COLUMNS[number]) => parsed.columns.indexOf(column);

  for (const [rowIndex, values] of parsed.rows.entries()) {
    const get = (column: typeof SOURCE_COLUMNS[number]) => values[indexOf(column)]?.trim() ?? "";
    const researchCompanyKey = get("research_company_key");
    const issue = (code: string, explanation: string) => {
      issues.push({
        rowNumber: rowIndex + 2,
        researchCompanyKey: researchCompanyKey || null,
        code,
        explanation,
      });
    };

    if (!researchCompanyKeys.has(researchCompanyKey)) {
      issue("research_company_key_unknown", "Source must reference a Company in the controlled baseline");
      continue;
    }
    if (get("source_name") === "" || get("source_title") === "" || get("evidence_type") === "") {
      issue("source_metadata_missing", "Source name, title, and evidence type are required");
      continue;
    }

    const sourceUrl = get("source_url");
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(sourceUrl);
    } catch {
      issue("source_url_invalid", "Source URL must be an absolute HTTPS URL");
      continue;
    }
    if (parsedUrl.protocol !== "https:") {
      issue("source_url_invalid", "Source URL must be an absolute HTTPS URL");
      continue;
    }
    if (seenSourceUrls.has(sourceUrl)) {
      issue("source_url_duplicate", "Source URL must be unique within the controlled manifest");
      continue;
    }
    if (!isDate(get("observed_date"))) {
      issue("observed_date_invalid", "Source observed date must use YYYY-MM-DD");
      continue;
    }
    if (get("verification_status") !== "official_source") {
      issue("verification_status_invalid", "Public demo Sources must be official sources");
      continue;
    }
    if (get("access_restriction") !== "public_web") {
      issue("access_restriction_invalid", "Public demo Sources must be marked public_web");
      continue;
    }

    seenSourceUrls.add(sourceUrl);
    records.push({
      researchCompanyKey,
      sourceName: get("source_name"),
      sourceTitle: get("source_title"),
      sourceUrl,
      evidenceType: get("evidence_type"),
      observedDate: get("observed_date"),
      verificationStatus: "official_source",
      accessRestriction: "public_web",
    });
  }
  return { records, issues };
}

