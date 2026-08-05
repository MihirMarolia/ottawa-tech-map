import type { Company } from "../entity-resolver/index.js";
import type { ImportFile, ImportInspection, OttawaImportPreview, PreviewId } from "./index.js";

export type ControlledImportReport = {
  companiesRead: number;
  validRecords: number;
  invalidRecords: number;
  acceptedCreated: number;
  acceptedAlreadyProcessed: number;
  reviewRequired: number;
  rejected: number;
  technicalFailures: number;
};

export interface ControlledOttawaImportApplication {
  inspectAndPreview(file: ImportFile): Promise<{
    inspection: ImportInspection;
    preview: OttawaImportPreview;
  }>;
  commit(previewId: PreviewId): Promise<ControlledImportReport>;
  listAcceptedProposals(): ReadonlyArray<import("./index.js").OttawaCompanyProposal>;
}

export { createControlledOttawaImportApplication } from "./lib/controlled-ottawa-import-application.js";

export type ControlledOttawaImportInput = {
  reviewedCompanies: ReadonlyArray<Company>;
};
