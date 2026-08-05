import type { Company } from "../../entity-resolver/index.js";
import type {
  ControlledImportReport,
  ControlledOttawaImportApplication,
} from "../controlled-ottawa-import.js";
import {
  createOttawaPublicDataImportService,
  type ImportFile,
  type OttawaCompanyProposal,
  type OttawaImportPreview,
  type PreviewId,
} from "../index.js";

const COLUMNS = [
  "research_company_key", "company_name", "canonical_domain",
  "headquarters_city", "province", "country", "operating_status",
  "short_description", "primary_sector", "employee_band", "founded_year",
  "last_verified_date", "source_url",
];

export function createControlledOttawaImportApplication(input: {
  reviewedCompanies: ReadonlyArray<Company>;
}): ControlledOttawaImportApplication {
  const acceptedByDomain = new Map<string, OttawaCompanyProposal>();
  let activeReport: ControlledImportReport | null = null;
  let latestPreview: OttawaImportPreview | null = null;

  const importService = createOttawaPublicDataImportService(async (proposal) => {
    if (activeReport === null) throw new Error("Controlled import commit is not active");
    const matches = input.reviewedCompanies.filter(
      (company) => company.canonicalDomain === proposal.canonicalDomain,
    );
    if (matches.length !== 1) {
      activeReport.reviewRequired += 1;
      return "review_required";
    }
    if (acceptedByDomain.has(proposal.canonicalDomain)) {
      activeReport.acceptedAlreadyProcessed += 1;
      return "accepted";
    }
    acceptedByDomain.set(proposal.canonicalDomain, proposal);
    activeReport.acceptedCreated += 1;
    return "accepted";
  });

  return {
    async inspectAndPreview(file: ImportFile) {
      const inspection = await importService.inspect(file);
      const preview = await importService.preview({
        previewId: "ottawa-public-demo-v1" as PreviewId,
        mappings: Object.fromEntries(COLUMNS.map((column) => [column, column])),
      }) as OttawaImportPreview;
      latestPreview = preview;
      return { inspection, preview };
    },
    async commit(previewId: PreviewId) {
      if (latestPreview === null || latestPreview.previewId !== previewId) {
        throw new Error("Only the latest controlled preview can be committed");
      }
      activeReport = {
        companiesRead: latestPreview.validRows + latestPreview.invalidRows,
        validRecords: latestPreview.validRows,
        invalidRecords: latestPreview.invalidRows,
        acceptedCreated: 0,
        acceptedAlreadyProcessed: 0,
        reviewRequired: 0,
        rejected: latestPreview.invalidRows,
        technicalFailures: 0,
      };
      try {
        await importService.commit(previewId);
        return { ...activeReport };
      } finally {
        activeReport = null;
      }
    },
    listAcceptedProposals: () => [...acceptedByDomain.values()],
  };
}
