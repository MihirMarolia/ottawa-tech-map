import { readFile } from "node:fs/promises";
import { reviewedOttawaDemoCompanies } from "../fixtures/ottawa-demo-companies.js";
import { createControlledOttawaImportApplication } from "../packages/institutional-import/controlled-ottawa-import.js";
import { validateOttawaSourceManifest } from "../packages/institutional-import/index.js";

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
    const sourceManifest = validateOttawaSourceManifest({
      name: "sources.csv",
      bytes: await readFile("data/ottawa-demo/sources.csv"),
    }, new Set(firstPreview.preview.proposals.map((proposal) => proposal.researchCompanyKey)));
    expect(sourceManifest.issues).toEqual([]);
    expect(sourceManifest.records).toHaveLength(28);
    expect(new Set(sourceManifest.records.map((record) => record.researchCompanyKey))).toEqual(
      new Set(firstPreview.preview.proposals.map((proposal) => proposal.researchCompanyKey)),
    );
    expect(sourceManifest.records.every((record) =>
      record.verificationStatus === "official_source" && record.accessRestriction === "public_web")).toBe(true);

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
  it("rejects unsafe, duplicate, and orphaned Source metadata", () => {
    const header = "research_company_key,source_name,source_title,source_url,evidence_type,observed_date,verification_status,access_restriction";
    const rows = [
      "known,Official,About,https://official.example/about,company_identity,2026-08-05,official_source,public_web",
      "known,Official,Duplicate,https://official.example/about,company_identity,2026-08-05,official_source,public_web",
      "unknown,Official,About,https://unknown.example/about,company_identity,2026-08-05,official_source,public_web",
      "known,Official,Unsafe,http://official.example/careers,job_posting_index,2026-08-05,official_source,public_web",
    ];
    const validation = validateOttawaSourceManifest({
      name: "sources.csv",
      bytes: new TextEncoder().encode([header, ...rows].join("\n")),
    }, new Set(["known"]));

    expect(validation.records).toHaveLength(1);
    expect(validation.issues.map((issue) => issue.code)).toEqual([
      "source_url_duplicate",
      "research_company_key_unknown",
      "source_url_invalid",
    ]);
  });
});
