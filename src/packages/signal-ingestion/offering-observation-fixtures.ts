import type {
  OfferingEvidenceType,
  OfferingKind,
  ProductEvidenceInput,
} from "./index.js";

export type FixtureOfferingClassification = OfferingKind | "unknown";

export type OfferingObservationFixture = {
  fixtureId: string;
  company: {
    name: string;
    domain: string;
  };
  classification: FixtureOfferingClassification;
  canonicalName: string;
  sources: ReadonlyArray<{
    sourceRecordId: string;
    sourceName: string;
    sourceUrl: string;
    observedAt: string;
    evidenceType: OfferingEvidenceType;
    confidence: number;
  }>;
};

export type PreparedOfferingFixture =
  | {
    status: "ready";
    fixtureId: string;
    commands: ReadonlyArray<ProductEvidenceInput>;
  }
  | {
    status: "review_required";
    fixtureId: string;
    reason: "unknown_offering_classification";
  };

/**
 * Converts a sanitized, test-only offering observation into the existing 07A
 * proposal command shape. It deliberately has no persistence behavior and
 * does not read the 08B YAML research artifact at application runtime.
 */
export function prepareOfferingObservationFixture(
  fixture: OfferingObservationFixture,
): PreparedOfferingFixture {
  const classification = fixture.classification;
  if (classification === "unknown") {
    return {
      status: "review_required",
      fixtureId: fixture.fixtureId,
      reason: "unknown_offering_classification",
    };
  }

  return {
    status: "ready",
    fixtureId: fixture.fixtureId,
    commands: fixture.sources.map((source) => ({
      companyName: fixture.company.name,
      companyDomain: fixture.company.domain,
      kind: classification,
      name: fixture.canonicalName,
      sourceName: source.sourceName,
      sourceUrl: source.sourceUrl,
      observedAt: source.observedAt,
      evidenceType: source.evidenceType,
      confidence: source.confidence,
    })),
  };
}
