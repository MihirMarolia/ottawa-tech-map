export type ImportFile = {
  name: string;
  bytes: Uint8Array;
};

export type ImportInspection = {
  rowCount: number;
  columns: ReadonlyArray<string>;
};

export type ColumnMapping = {
  previewId: PreviewId;
  mappings: Readonly<Record<string, string>>;
};

export type PreviewId = string & { readonly __brand: "PreviewId" };

export type ImportPreview = {
  previewId: PreviewId;
  validRows: number;
  invalidRows: number;
  ambiguousRows: number;
};

export type ImportOutcome = {
  acceptedRows: number;
  rejectedRows: number;
  reviewRequiredRows: number;
};

export interface InstitutionalImportService {
  inspect(file: ImportFile): Promise<ImportInspection>;
  preview(mapping: ColumnMapping): Promise<ImportPreview>;
  commit(previewId: PreviewId): Promise<ImportOutcome>;
}
