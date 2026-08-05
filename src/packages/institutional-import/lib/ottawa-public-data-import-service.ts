import { createHash } from "node:crypto";
import type { ColumnMapping, ImportFile, ImportInspection, ImportOutcome, InstitutionalImportService, OttawaCompanyProposal, OttawaCompanyProposalCommitter, OttawaImportPreview, PreviewId } from "../index.js";

const REQUIRED_COLUMNS = ["research_company_key", "company_name", "canonical_domain", "headquarters_city", "province", "country", "operating_status", "short_description", "primary_sector", "employee_band", "founded_year", "last_verified_date", "source_url"] as const;
type ParsedCsv = { columns: string[]; rows: string[][] };

export function parseCsv(text: string): ParsedCsv {
  const records: string[][] = []; let record: string[] = []; let field = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted && character === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { record.push(field.trim()); field = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      record.push(field.trim()); if (record.some((value) => value)) records.push(record); record = []; field = "";
    } else field += character;
  }
  if (field || record.length) { record.push(field.trim()); records.push(record); }
  return { columns: records[0] ?? [], rows: records.slice(1) };
}

const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const isDomain = (value: string) => /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value);

export function createOttawaPublicDataImportService(commitProposal: OttawaCompanyProposalCommitter): InstitutionalImportService {
  let inspected: ParsedCsv | null = null;
  const previews = new Map<PreviewId, OttawaImportPreview>();
  return {
    async inspect(file: ImportFile): Promise<ImportInspection> {
      if (!file.name.toLowerCase().endsWith(".csv")) throw new Error("Only CSV files are supported");
      inspected = parseCsv(new TextDecoder("utf-8", { fatal: true }).decode(file.bytes));
      return { rowCount: inspected.rows.length, columns: inspected.columns };
    },
    async preview(mapping: ColumnMapping): Promise<OttawaImportPreview> {
      if (!inspected) throw new Error("inspect must be called before preview");
      const data = inspected;
      const missing = REQUIRED_COLUMNS.filter((column) => !data.columns.includes(mapping.mappings[column] ?? ""));
      if (missing.length) throw new Error(`Missing required columns: ${missing.join(", ")}`);
      const proposals: OttawaCompanyProposal[] = []; const issues: OttawaImportPreview["issues"][number][] = [];
      const indexOf = (column: string) => data.columns.indexOf(mapping.mappings[column] ?? column);
      for (const [rowIndex, values] of data.rows.entries()) {
        const get = (column: string) => values[indexOf(column)] ?? ""; const key = get("research_company_key") || null; const domain = get("canonical_domain").toLowerCase();
        if (!isDomain(domain)) { issues.push({ rowNumber: rowIndex + 2, researchCompanyKey: key, code: "canonical_domain_invalid", explanation: "canonical_domain must be a hostname without a path" }); continue; }
        if (!isDate(get("last_verified_date"))) { issues.push({ rowNumber: rowIndex + 2, researchCompanyKey: key, code: "last_verified_date_invalid", explanation: "last_verified_date must use YYYY-MM-DD" }); continue; }
        const status = get("operating_status");
        if (status !== "active" && status !== "inactive" && status !== "merged") { issues.push({ rowNumber: rowIndex + 2, researchCompanyKey: key, code: "operating_status_invalid", explanation: "operating_status must be active, inactive, or merged" }); continue; }
        const sourceUrl = get("source_url"); try { new URL(sourceUrl); } catch { issues.push({ rowNumber: rowIndex + 2, researchCompanyKey: key, code: "source_url_invalid", explanation: "source_url must be an absolute URL" }); continue; }
        const foundedYear = get("founded_year");
        proposals.push({ researchCompanyKey: key ?? "", canonicalName: get("company_name"), canonicalDomain: domain, headquartersCity: get("headquarters_city"), province: get("province"), country: get("country"), operatingStatus: status, shortDescription: get("short_description"), primarySector: get("primary_sector"), employeeBand: get("employee_band") || null, foundedYear: foundedYear ? Number(foundedYear) : null, lastVerifiedDate: get("last_verified_date"), sourceUrl });
      }
      const digest = createHash("sha256").update(JSON.stringify(proposals)).digest("hex").slice(0, 16);
      const previewId = `${String(mapping.previewId)}-${digest}` as PreviewId;
      const result: OttawaImportPreview = { previewId, validRows: proposals.length, invalidRows: issues.length, ambiguousRows: 0, proposals, issues };
      previews.set(previewId, result); return result;
    },
    async commit(previewId: PreviewId): Promise<ImportOutcome> {
      const preview = previews.get(previewId); if (!preview) throw new Error("Unknown or expired preview");
      const outcome = { acceptedRows: 0, rejectedRows: preview.invalidRows, reviewRequiredRows: 0 };
      for (const proposal of preview.proposals) { const result = await commitProposal(proposal); if (result === "accepted") outcome.acceptedRows += 1; else if (result === "review_required") outcome.reviewRequiredRows += 1; else outcome.rejectedRows += 1; }
      return outcome;
    },
  };
}
