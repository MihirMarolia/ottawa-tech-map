import { ottawaDemoDirectory } from "../demo-data.js";
import {
  filterDirectory,
  renderCompanyDirectory,
  renderDirectoryCompanyProfile,
  summarizeCompanyIndicators,
} from "../directory.js";

describe("Ottawa Company directory", () => {
  it("searches and filters using explicit Evidence", () => {
    expect(filterDirectory(ottawaDemoDirectory, { query: "cybersecurity" }).map((company) => company.canonicalName)).toEqual(["Field Effect", "Atlas Secure Networks"]);
    expect(filterDirectory(ottawaDemoDirectory, { governmentContract: true }).map((company) => company.canonicalName)).toEqual([
      "Northstar Civic Systems",
      "Civic Orbit Technologies",
      "Atlas Secure Networks",
    ]);

    expect(filterDirectory(ottawaDemoDirectory, { activeHiring: true }).map((company) => company.canonicalName)).toEqual([
      "Fullscript",
      "Northstar Civic Systems",
      "Civic Orbit Technologies",
      "Atlas Secure Networks",
    ]);
  });

  it("renders the real directory surface with provenance-aware labels", () => {
    const html = renderCompanyDirectory(ottawaDemoDirectory);
    expect(html).toContain("13 Companies");
    expect(html).toContain("Shopify");
    expect(html).toContain("/companies/northstar-civic-systems");
    expect(html).toContain("Government-contract Evidence");
    expect(html).not.toContain("undefined");
  });

  it("renders a Company evidence timeline without raw source content", () => {
    const company = ottawaDemoDirectory.find((candidate) => candidate.slug === "northstar-civic-systems") ?? null;
    const html = renderDirectoryCompanyProfile(company);
    expect(html).toContain("Platform Security Engineer");
    expect(html).toContain("Professional services");
    expect(html).toContain("Fictional test fixture");
    expect(html).toContain("Source:");
    expect(html).not.toContain("rawText");
    expect(html).toContain("Current indicators");
    expect(html).toContain("Job postings observed in the last 90 days");
    expect(html).toContain("Government contracts observed in the last 24 months");
    expect(html).toContain("Counts use observed Evidence, not inferred Company performance");
    expect(summarizeCompanyIndicators(company!)).toEqual({
      jobPostingsObservedLast90Days: 1,
      governmentContractsObservedLast24Months: 1,
      securityClearanceRolesDetected: 1,
      bilingualRolesDetected: 0,
      technologiesRecentlyMentioned: ["PostgreSQL", "TypeScript"],
      referenceDate: "2026-08-05",
    });

  });
});
