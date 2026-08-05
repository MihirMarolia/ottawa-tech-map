import { readFile } from "node:fs/promises";
import { reviewedOttawaDemoCompanies } from "../fixtures/ottawa-demo-companies.js";
import { createControlledOttawaImportApplication } from "../packages/institutional-import/controlled-ottawa-import.js";

describe("controlled Ottawa public-data import", () => {
  it("previews, commits, and replays all reviewed Companies deterministically", async () => {
    const application = createControlledOttawaImportApplication({
      reviewedCompanies: reviewedOttawaDemoCompanies,
    });
    const file = {
      name: "companies.csv",
      bytes: await readFile("data/ottawa-demo/companies.csv"),
    };
    const firstPreview = await application.inspectAndPreview(file);
    expect(firstPreview.preview).toMatchObject({
      validRows: 10,
      invalidRows: 0,
      ambiguousRows: 0,
    });
    await expect(application.commit(firstPreview.preview.previewId)).resolves.toEqual({
      companiesRead: 10,
      validRecords: 10,
      invalidRecords: 0,
      acceptedCreated: 10,
      acceptedAlreadyProcessed: 0,
      reviewRequired: 0,
      rejected: 0,
      technicalFailures: 0,
    });

    const replayPreview = await application.inspectAndPreview(file);
    await expect(application.commit(replayPreview.preview.previewId)).resolves.toEqual({
      companiesRead: 10,
      validRecords: 10,
      invalidRecords: 0,
      acceptedCreated: 0,
      acceptedAlreadyProcessed: 10,
      reviewRequired: 0,
      rejected: 0,
      technicalFailures: 0,
    });
    expect(application.listAcceptedProposals()).toHaveLength(10);
  });

  it("routes an unreviewed canonical domain to the Review Queue outcome", async () => {
    const application = createControlledOttawaImportApplication({
      reviewedCompanies: reviewedOttawaDemoCompanies.slice(0, 9),
    });
    const result = await application.inspectAndPreview({
      name: "companies.csv",
      bytes: await readFile("data/ottawa-demo/companies.csv"),
    });
    const report = await application.commit(result.preview.previewId);
    expect(report).toMatchObject({
      acceptedCreated: 9,
      reviewRequired: 1,
      rejected: 0,
      technicalFailures: 0,
    });
    expect(application.listAcceptedProposals()).toHaveLength(9);
  });
});
