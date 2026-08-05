import type {
  ColumnMapping,
  ImportFile,
  ImportInspection,
  ImportOutcome,
  ImportPreview,
  InstitutionalImportService,
  PreviewId,
} from "../index.js";
import { readFile } from "node:fs/promises";
import { createOttawaPublicDataImportService, type OttawaImportPreview } from "../index.js";

describe("InstitutionalImportService contract", () => {
  it("accepts the public interface shape", () => {
    const service: InstitutionalImportService = {
      inspect: async (_file: ImportFile): Promise<ImportInspection> => ({
        rowCount: 0,
        columns: [],
      }),
      preview: async (_mapping: ColumnMapping): Promise<ImportPreview> => ({
        previewId: "preview-1" as PreviewId,
        validRows: 0,
        invalidRows: 0,
        ambiguousRows: 0,
      }),
      commit: async (_previewId: PreviewId): Promise<ImportOutcome> => ({
        acceptedRows: 0,
        rejectedRows: 0,
        reviewRequiredRows: 0,
      }),
    };

    expect(service.inspect).toBeDefined();
    expect(service.preview).toBeDefined();
    expect(service.commit).toBeDefined();
  });
});

const columns = ["research_company_key", "company_name", "canonical_domain", "headquarters_city", "province", "country", "operating_status", "short_description", "primary_sector", "employee_band", "founded_year", "last_verified_date", "source_url"];
const mappings = Object.fromEntries(columns.map((column) => [column, column]));

describe("Ottawa public-data import", () => {
  it("previews the controlled dataset deterministically", async () => {
    const service = createOttawaPublicDataImportService(async () => "accepted");
    const bytes = await readFile("data/ottawa-demo/companies.csv");
    expect(await service.inspect({ name: "companies.csv", bytes })).toEqual({ rowCount: 10, columns });
    const first = await service.preview({ previewId: "demo" as PreviewId, mappings }) as OttawaImportPreview;
    const second = await service.preview({ previewId: "demo" as PreviewId, mappings }) as OttawaImportPreview;
    expect(first).toEqual(second);
    expect(first).toMatchObject({ validRows: 10, invalidRows: 0, ambiguousRows: 0 });
    expect(first.proposals[0]).toMatchObject({ researchCompanyKey: "ottawa-shopify", canonicalDomain: "shopify.com", headquartersCity: "Ottawa" });
  });

  it("reports malformed rows without leaking source values", async () => {
    const csv = `${columns.join(",")}\ninvalid,Example,not-a-domain,Ottawa,Ontario,Canada,active,Description,Software,,,2026-08-05,https://example.com/raw-secret`;
    const service = createOttawaPublicDataImportService(async () => "accepted");
    await service.inspect({ name: "invalid.csv", bytes: new TextEncoder().encode(csv) });
    const preview = await service.preview({ previewId: "invalid" as PreviewId, mappings }) as OttawaImportPreview;
    expect(preview.issues).toEqual([{ rowNumber: 2, researchCompanyKey: "invalid", code: "canonical_domain_invalid", explanation: "canonical_domain must be a hostname without a path" }]);
    expect(JSON.stringify(preview.issues)).not.toContain("raw-secret");
  });

  it("commits typed proposals through the supplied boundary", async () => {
    const service = createOttawaPublicDataImportService(async (proposal) => proposal.researchCompanyKey === "ottawa-ranovus" ? "review_required" : "accepted");
    await service.inspect({ name: "companies.csv", bytes: await readFile("data/ottawa-demo/companies.csv") });
    const preview = await service.preview({ previewId: "commit" as PreviewId, mappings }) as OttawaImportPreview;
    await expect(service.commit(preview.previewId)).resolves.toEqual({ acceptedRows: 9, rejectedRows: 0, reviewRequiredRows: 1 });
  });
});
