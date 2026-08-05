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

export type OttawaCompanyProposal = {
  researchCompanyKey: string;
  canonicalName: string;
  canonicalDomain: string;
  headquartersCity: string;
  province: string;
  country: string;
  operatingStatus: "active" | "inactive" | "merged";
  shortDescription: string;
  primarySector: string;
  employeeBand: string | null;
  foundedYear: number | null;
  lastVerifiedDate: string;
  sourceUrl: string;
};

export type ImportRowIssue = {
  rowNumber: number;
  researchCompanyKey: string | null;
  code: string;
  explanation: string;
};
export type OttawaSourceProposal = {
  researchCompanyKey: string;
  sourceName: string;
  sourceTitle: string;
  sourceUrl: string;
  evidenceType: string;
  observedDate: string;
  verificationStatus: "official_source";
  accessRestriction: "public_web";
};

export type OttawaSourceManifestValidation = {
  records: ReadonlyArray<OttawaSourceProposal>;
  issues: ReadonlyArray<ImportRowIssue>;
};


export type OttawaImportPreview = ImportPreview & {
  proposals: ReadonlyArray<OttawaCompanyProposal>;
  issues: ReadonlyArray<ImportRowIssue>;
};

export type OttawaCompanyProposalCommitter = (
  proposal: OttawaCompanyProposal,
) => Promise<"accepted" | "review_required" | "rejected">;

export interface InstitutionalImportService {
  inspect(file: ImportFile): Promise<ImportInspection>;
  preview(mapping: ColumnMapping): Promise<ImportPreview>;
  commit(previewId: PreviewId): Promise<ImportOutcome>;
}

export { createOttawaPublicDataImportService } from "./lib/ottawa-public-data-import-service.js";
export { validateOttawaSourceManifest } from "./lib/ottawa-source-manifest.js";
