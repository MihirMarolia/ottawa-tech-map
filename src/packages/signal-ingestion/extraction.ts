import type { SanitizedCorporateText } from "../privacy-gateway/index.js";
import type { ExtractedSignalDraft, SignalExtractor } from "./index.js";

export type { SignalExtractor, ExtractedSignalDraft };

export function defineSignalExtractor(
  extractor: SignalExtractor,
): SignalExtractor {
  return extractor;
}

export type ModelFacingExtraction = SignalExtractor["extractSignals"];

export type AcceptsSanitizedInput = Parameters<ModelFacingExtraction>[0] extends SanitizedCorporateText
  ? true
  : never;
