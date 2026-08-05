import type { SanitizedCorporateText } from "../../privacy-gateway/index.js";
import type { SourceId } from "../index.js";
import {
  createJobPostingExtractionService,
  evaluateJobPostingExtractor,
  type JobPostingExtractionEvaluationCase,
  type JobPostingExtractionModel,
  type ModelExtractedField,
} from "../job-posting-extraction.js";

const sanitized = (value: string) => value as SanitizedCorporateText;
const sourceId = (value: string) => value as SourceId;

function located<T>(text: SanitizedCorporateText, phrase: string, value: T): ModelExtractedField<T> {
  const start = text.indexOf(phrase);
  if (start < 0) throw new Error(`Missing deterministic evaluation phrase: ${phrase}`);
  return { value, evidenceLocation: { start, end: start + phrase.length }, confidence: "high" };
}

const deterministicModel: JobPostingExtractionModel = {
  modelVersion: "deterministic-evaluation/v1",
  async extract(text) {
    const technologyNames = ["TypeScript", "PostgreSQL", "Python"];
    return {
      jobTitle: located(text, "Software Engineer", "Software Engineer"),
      location: located(text, "Ottawa", "Ottawa"),
      technologies: technologyNames
        .filter((technology) => text.includes(technology))
        .map((technology) => located(text, technology, technology)),
      securityClearanceRequirement: text.includes("security clearance required")
        ? located(text, "security clearance required", true as const)
        : null,
      bilingualRequirement: text.includes("bilingual English and French required")
        ? located(text, "bilingual English and French required", true as const)
        : null,
      expansionEvidence: text.includes("new Ottawa team")
        ? located(text, "new Ottawa team", true as const)
        : null,
    };
  },
};

function evaluationCases(): ReadonlyArray<JobPostingExtractionEvaluationCase> {
  return Array.from({ length: 20 }, (_, index) => {
    const hasClearance = index % 2 === 0;
    const hasBilingual = index % 3 === 0;
    const technologies = index % 2 === 0 ? ["TypeScript", "PostgreSQL"] : ["Python"];
    const text = sanitized([
      "Software Engineer",
      "Ottawa",
      ...technologies,
      hasClearance ? "security clearance required" : "standard screening",
      hasBilingual ? "bilingual English and French required" : "English language role",
      index % 4 === 0 ? "new Ottawa team" : "existing team",
    ].join(". "));
    return {
      key: `evaluation-${index + 1}`,
      sourceId: sourceId(`source-${index + 1}`),
      observedAt: "2026-07-01",
      sanitizedText: text,
      expected: {
        technologies,
        securityClearanceRequirement: hasClearance,
        bilingualRequirement: hasBilingual,
      },
    };
  });
}

describe("job-posting extraction boundary", () => {
  it("returns review-required fields with evidence lineage and no source excerpts", async () => {
    const service = createJobPostingExtractionService(deterministicModel);
    const text = sanitized(
      "Software Engineer. Ottawa. TypeScript. security clearance required. bilingual English and French required. new Ottawa team",
    );

    const result = await service.extract({
      sourceId: sourceId("source-job-1"),
      observedAt: "2026-07-01",
      sanitizedText: text,
    });

    expect(result.status).toBe("proposed");
    if (result.status !== "proposed") return;
    expect(result.proposal.status).toBe("review_required");
    expect(result.proposal.technologies[0]).toMatchObject({
      value: "TypeScript",
      sourceId: "source-job-1",
      observedAt: "2026-07-01",
      modelVersion: "deterministic-evaluation/v1",
      extractorVersion: "job-posting-extractor/v1",
      confidence: "high",
    });
    expect(result.proposal.securityClearanceRequirement?.value).toBe(true);
    expect(result.proposal.bilingualRequirement?.value).toBe(true);
    expect(JSON.stringify(result)).not.toContain("security clearance required");
  });

  it("treats absent optional requirements as absent evidence", async () => {
    const service = createJobPostingExtractionService(deterministicModel);
    const result = await service.extract({
      sourceId: sourceId("source-job-2"),
      observedAt: "2026-07-01",
      sanitizedText: sanitized("Software Engineer. Ottawa. Python. standard screening. English language role"),
    });

    expect(result.status).toBe("proposed");
    if (result.status !== "proposed") return;
    expect(result.proposal.securityClearanceRequirement).toBeNull();
    expect(result.proposal.bilingualRequirement).toBeNull();
  });

  it("rejects malformed model evidence locations", async () => {
    const malformedModel: JobPostingExtractionModel = {
      modelVersion: "malformed/v1",
      async extract(text) {
        const valid = located(text, "Ottawa", "Ottawa");
        return {
          jobTitle: { ...valid, value: "Engineer", evidenceLocation: { start: -1, end: 3 } },
          location: valid,
          technologies: [],
          securityClearanceRequirement: null,
          bilingualRequirement: null,
          expansionEvidence: null,
        };
      },
    };
    const service = createJobPostingExtractionService(malformedModel);
    await expect(service.extract({
      sourceId: sourceId("source-job-3"),
      observedAt: "2026-07-01",
      sanitizedText: sanitized("Ottawa"),
    })).resolves.toEqual({ status: "rejected", reason: "invalid_model_output" });
  });

  it("passes the 20-case precision gate for deterministic sanitized fixtures", async () => {
    const evaluation = await evaluateJobPostingExtractor(
      createJobPostingExtractionService(deterministicModel),
      evaluationCases(),
    );

    expect(evaluation).toEqual({
      caseCount: 20,
      validCaseCount: 20,
      clearancePrecision: 1,
      bilingualPrecision: 1,
      technologyPrecision: 1,
      passed: true,
    });
  });

  it("does not pass when any evaluation output is malformed", async () => {
    let call = 0;
    const partlyMalformed: JobPostingExtractionModel = {
      ...deterministicModel,
      async extract(text) {
        call += 1;
        const output = await deterministicModel.extract(text);
        return call === 20
          ? { ...output, jobTitle: { ...output.jobTitle, evidenceLocation: { start: -1, end: 2 } } }
          : output;
      },
    };

    const evaluation = await evaluateJobPostingExtractor(
      createJobPostingExtractionService(partlyMalformed),
      evaluationCases(),
    );

    expect(evaluation.validCaseCount).toBe(19);
    expect(evaluation.passed).toBe(false);
  });
});

