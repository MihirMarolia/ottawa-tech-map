import type { ExternalReference } from "../index.js";
import type { IngestCorporateSource } from "../index.js";

export type GovernmentContractSourceDocument = {
  companyName: string;
  companyDomain: string;
  jurisdiction: string;
  contractType: "professional_services";
  observedAt: string;
  confidence: number;
  schemaVersion: "government-contract-signal/v1";
  externalReference: ExternalReference;
};

export type SourceDocumentParseResult =
  | { status: "valid"; sourceDocument: GovernmentContractSourceDocument }
  | {
      status: "invalid";
      reason: "invalid_source_document" | "invalid_external_reference";
    };

const EXTERNAL_REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;

export function parseGovernmentContractSourceDocument(
  command: IngestCorporateSource,
): SourceDocumentParseResult {
  try {
    const value: unknown = JSON.parse(command.sanitizedText);
    if (
      typeof value !== "object" ||
      value === null ||
      !("companyName" in value) ||
      typeof value.companyName !== "string" ||
      !("companyDomain" in value) ||
      typeof value.companyDomain !== "string" ||
      !("jurisdiction" in value) ||
      typeof value.jurisdiction !== "string" ||
      !("contractType" in value) ||
      value.contractType !== "professional_services" ||
      !("observedAt" in value) ||
      typeof value.observedAt !== "string" ||
      !("confidence" in value) ||
      typeof value.confidence !== "number" ||
      value.confidence < 0 ||
      value.confidence > 1 ||
      !("schemaVersion" in value) ||
      value.schemaVersion !== "government-contract-signal/v1"
    ) {
      return { status: "invalid", reason: "invalid_source_document" };
    }

    if (
      !("externalReference" in value) ||
      typeof value.externalReference !== "string" ||
      !EXTERNAL_REFERENCE_PATTERN.test(value.externalReference)
    ) {
      return { status: "invalid", reason: "invalid_external_reference" };
    }

    return {
      status: "valid",
      sourceDocument: {
        companyName: value.companyName,
        companyDomain: value.companyDomain,
        jurisdiction: value.jurisdiction,
        contractType: value.contractType,
        observedAt: value.observedAt,
        confidence: value.confidence,
        schemaVersion: value.schemaVersion,
        externalReference: value.externalReference as ExternalReference,
      },
    };
  } catch {
    return { status: "invalid", reason: "invalid_source_document" };
  }
}

export function canonicalizeSourceDocument(sourceDocument: string): string {
  return sourceDocument.replace(/\r\n?/g, "\n").trim();
}
