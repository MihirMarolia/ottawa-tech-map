import type { RawSourceText } from "../packages/privacy-gateway/index.js";
import type { JobPostingFixture, SourceId } from "../packages/signal-ingestion/index.js";

const privacySafeJobPosting = JSON.stringify({
  companyName: "Northstar Civic Systems",
  companyDomain: "northstar-civic.example",
  jurisdiction: "CA-ON",
  jobTitle: "Platform Security Engineer",
  location: "Ottawa, Ontario",
  postingDate: "2026-08-01",
  technologies: ["TypeScript", "PostgreSQL"],
  securityClearanceRequired: true,
  bilingualRequired: false,
  employmentType: "full_time",
  expansionEvidence: false,
  observedAt: "2026-08-05",
  confidence: 0.97,
  schemaVersion: "job-posting-signal/v1",
  externalReference: null,
});

export const fictionalJobPostingFixture: JobPostingFixture = {
  source: {
    id: "source:caller-job-posting-1" as SourceId,
    name: "Northstar Civic Systems careers fixture",
    url: "https://careers.northstar-civic.example/jobs/platform-security-engineer",
  },
  observedAt: "2026-08-05",
  rawText: privacySafeJobPosting as RawSourceText,
};
