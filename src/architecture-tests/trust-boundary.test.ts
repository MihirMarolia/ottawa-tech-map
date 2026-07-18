import { describe, expectTypeOf, it } from "vitest";
import type {
  RawSourceText,
  SanitizedCorporateText,
} from "../packages/privacy-gateway/index.js";
import type { SignalExtractor } from "../packages/signal-ingestion/index.js";
import type { AcceptsSanitizedInput } from "../packages/signal-ingestion/extraction.js";

describe("trust boundary types", () => {
  it("brands RawSourceText separately from SanitizedCorporateText", () => {
    expectTypeOf<RawSourceText>().not.toEqualTypeOf<SanitizedCorporateText>();
  });

  it("requires model-facing extraction to accept SanitizedCorporateText", () => {
    type ExtractParams = Parameters<SignalExtractor["extractSignals"]>;
    expectTypeOf<ExtractParams>().toEqualTypeOf<[SanitizedCorporateText]>();
    expectTypeOf<AcceptsSanitizedInput>().toEqualTypeOf<true>();
  });

  it("rejects RawSourceText at the extraction seam", () => {
    type ExtractParams = Parameters<SignalExtractor["extractSignals"]>;
    expectTypeOf<RawSourceText>().not.toMatchTypeOf<ExtractParams[0]>();
  });
});

describe("score evidence contract", () => {
  it("requires evidence on score components", () => {
    type Component = import("../packages/company-intelligence-scorer/index.js").ScoreComponent;
    expectTypeOf<Component["evidenceSignalIds"]>().toEqualTypeOf<
      ReadonlyArray<import("../packages/signal-ingestion/index.js").SignalId>
    >();
  });
});

describe("Signal provenance contract", () => {
  it("requires Source provenance without raw text persistence", () => {
    type Signal = import("../packages/signal-ingestion/index.js").GovernmentContractSignal;
    type Source = import("../packages/signal-ingestion/index.js").Source;
    type SourceId = import("../packages/signal-ingestion/index.js").SourceId;

    expectTypeOf<Signal["sourceId"]>().toEqualTypeOf<SourceId>();
    expectTypeOf<Signal>().toHaveProperty("observedAt");
    expectTypeOf<Signal>().toHaveProperty("confidence");
    expectTypeOf<Signal>().toHaveProperty("schemaVersion");
    expectTypeOf<"rawText">().not.toMatchTypeOf<keyof Signal | keyof Source>();
    expectTypeOf<"sanitizedText">().not.toMatchTypeOf<
      keyof Signal | keyof Source
    >();
  });
});
