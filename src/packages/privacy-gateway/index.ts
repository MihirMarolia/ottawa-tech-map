export type RawSourceText = string & { readonly __brand: "RawSourceText" };
export type SanitizedCorporateText = string & {
  readonly __brand: "SanitizedCorporateText";
};

export type CorporateSourceInput = {
  rawText: RawSourceText;
  sourceUrl: string;
};

export type SanitizationResult = {
  sanitizedText: SanitizedCorporateText | null;
  redactions: ReadonlyArray<string>;
  version: string;
};

export interface PrivacyGateway {
  sanitize(input: CorporateSourceInput): SanitizationResult;
  assertSafe(result: SanitizationResult): SanitizedCorporateText;
}

export { createPrivacyGateway } from "./lib/privacy-gateway.js";
