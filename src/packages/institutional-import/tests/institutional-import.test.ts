import type {
  ColumnMapping,
  ImportFile,
  ImportInspection,
  ImportOutcome,
  ImportPreview,
  InstitutionalImportService,
  PreviewId,
} from "../index.js";

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
