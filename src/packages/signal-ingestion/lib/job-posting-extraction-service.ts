import type {
  ExtractedField,
  JobPostingExtractionEvaluation,
  JobPostingExtractionEvaluationCase,
  JobPostingExtractionModel,
  JobPostingExtractionProposal,
  JobPostingExtractionService,
  ModelExtractedField,
} from "../job-posting-extraction.js";
import type { SourceId } from "../index.js";

const EXTRACTOR_VERSION = "job-posting-extractor/v1" as const;

function isLocationValid(
  field: ModelExtractedField<unknown>,
  inputLength: number,
): boolean {
  return Number.isSafeInteger(field.evidenceLocation.start) &&
    Number.isSafeInteger(field.evidenceLocation.end) &&
    field.evidenceLocation.start >= 0 &&
    field.evidenceLocation.end > field.evidenceLocation.start &&
    field.evidenceLocation.end <= inputLength &&
    (field.confidence === "high" || field.confidence === "medium" || field.confidence === "low");
}

function addLineage<T>(
  field: ModelExtractedField<T>,
  sourceId: SourceId,
  observedAt: string,
  modelVersion: string,
): ExtractedField<T> {
  return {
    ...field,
    sourceId,
    observedAt,
    modelVersion,
    extractorVersion: EXTRACTOR_VERSION,
  };
}

export function createJobPostingExtractionService(
  model: JobPostingExtractionModel,
): JobPostingExtractionService {
  if (model.modelVersion.trim() === "") throw new Error("Model version is required");
  return {
    async extract(command) {
      const output = await model.extract(command.sanitizedText);
      const fields: ReadonlyArray<ModelExtractedField<unknown>> = [
        output.jobTitle,
        output.location,
        ...output.technologies,
        ...(output.securityClearanceRequirement ? [output.securityClearanceRequirement] : []),
        ...(output.bilingualRequirement ? [output.bilingualRequirement] : []),
        ...(output.expansionEvidence ? [output.expansionEvidence] : []),
      ];
      if (
        typeof output.jobTitle.value !== "string" || output.jobTitle.value.trim() === "" ||
        typeof output.location.value !== "string" || output.location.value.trim() === "" ||
        output.technologies.some((field) => typeof field.value !== "string" || field.value.trim() === "") ||
        (output.securityClearanceRequirement !== null && output.securityClearanceRequirement.value !== true) ||
        (output.bilingualRequirement !== null && output.bilingualRequirement.value !== true) ||
        (output.expansionEvidence !== null && output.expansionEvidence.value !== true) ||
        fields.some((field) => !isLocationValid(field, command.sanitizedText.length))
      ) return { status: "rejected", reason: "invalid_model_output" };

      const proposal: JobPostingExtractionProposal = {
        status: "review_required",
        sourceId: command.sourceId,
        observedAt: command.observedAt,
        jobTitle: addLineage(output.jobTitle, command.sourceId, command.observedAt, model.modelVersion),
        location: addLineage(output.location, command.sourceId, command.observedAt, model.modelVersion),
        technologies: output.technologies.map((field) => addLineage(field, command.sourceId, command.observedAt, model.modelVersion)),
        securityClearanceRequirement: output.securityClearanceRequirement
          ? addLineage(output.securityClearanceRequirement, command.sourceId, command.observedAt, model.modelVersion) : null,
        bilingualRequirement: output.bilingualRequirement
          ? addLineage(output.bilingualRequirement, command.sourceId, command.observedAt, model.modelVersion) : null,
        expansionEvidence: output.expansionEvidence
          ? addLineage(output.expansionEvidence, command.sourceId, command.observedAt, model.modelVersion) : null,
      };
      return { status: "proposed", proposal };
    },
  };
}

const precision = (truePositive: number, falsePositive: number) =>
  truePositive + falsePositive === 0 ? 1 : truePositive / (truePositive + falsePositive);

export async function evaluateJobPostingExtractor(
  service: JobPostingExtractionService,
  cases: ReadonlyArray<JobPostingExtractionEvaluationCase>,
): Promise<JobPostingExtractionEvaluation> {
  let clearanceTruePositive = 0; let clearanceFalsePositive = 0;
  let validCaseCount = 0;
  let bilingualTruePositive = 0; let bilingualFalsePositive = 0;
  let technologyTruePositive = 0; let technologyFalsePositive = 0;
  for (const evaluationCase of cases) {
    const result = await service.extract(evaluationCase);
    if (result.status !== "proposed") continue;
    const clearancePredicted = result.proposal.securityClearanceRequirement !== null;
    validCaseCount += 1;
    if (clearancePredicted && evaluationCase.expected.securityClearanceRequirement) clearanceTruePositive += 1;
    if (clearancePredicted && !evaluationCase.expected.securityClearanceRequirement) clearanceFalsePositive += 1;
    const bilingualPredicted = result.proposal.bilingualRequirement !== null;
    if (bilingualPredicted && evaluationCase.expected.bilingualRequirement) bilingualTruePositive += 1;
    if (bilingualPredicted && !evaluationCase.expected.bilingualRequirement) bilingualFalsePositive += 1;
    const expectedTechnologies = new Set(evaluationCase.expected.technologies.map((value) => value.toLowerCase()));
    for (const field of result.proposal.technologies) {
      if (expectedTechnologies.has(field.value.toLowerCase())) technologyTruePositive += 1;
      else technologyFalsePositive += 1;
    }
  }
  const clearancePrecision = precision(clearanceTruePositive, clearanceFalsePositive);
  const bilingualPrecision = precision(bilingualTruePositive, bilingualFalsePositive);
  const technologyPrecision = precision(technologyTruePositive, technologyFalsePositive);
  return {
    caseCount: cases.length,
    clearancePrecision,
    validCaseCount,
    bilingualPrecision,
    technologyPrecision,
    passed: cases.length >= 20 && validCaseCount === cases.length && clearancePrecision >= 0.95 &&
      bilingualPrecision >= 0.95 && technologyPrecision >= 0.9,
  };
}
