import type { Company, CompanyId } from "../entity-resolver/index.js";
import type {
  IngestionOutcome,
  JobPostingFixture,
  JobPostingSignal,
  Source,
} from "./index.js";

export type JobPostingEvidence = Omit<JobPostingSignal, "companyId" | "sourceId"> & {
  source: Pick<Source, "id" | "name" | "url">;
};

export type JobPostingCompanyProfile = {
  company: Company;
  evidence: ReadonlyArray<JobPostingEvidence>;
};

export interface JobPostingEvidenceQuery {
  findCompanyProfile(companyId: CompanyId): Promise<JobPostingCompanyProfile | null>;
}

export type JobPostingFixtureApplication = {
  ingestJobPostingFixture(fixture: JobPostingFixture): Promise<IngestionOutcome>;
  companyEvidenceQuery: JobPostingEvidenceQuery;
  inspectInMemoryPersistence(): {
    companyCount: number;
    sourceCount: number;
    signalCount: number;
    evidenceCount: number;
  };
};

export { createJobPostingFixtureApplication } from "./lib/job-posting-fixture-application.js";
