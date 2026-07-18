import type {
  CorporateSourceInput,
  PrivacyGateway,
  SanitizationResult,
  SanitizedCorporateText,
} from "../index.js";

const PERSONAL_CONTENT_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}\b/,
];

class FixturePrivacyGateway implements PrivacyGateway {
  sanitize(input: CorporateSourceInput): SanitizationResult {
    const containsPersonalContent = PERSONAL_CONTENT_PATTERNS.some((pattern) =>
      pattern.test(input.rawText),
    );

    return {
      sanitizedText: containsPersonalContent
        ? null
        : (String(input.rawText) as SanitizedCorporateText),
      redactions: containsPersonalContent ? ["personal_contact_information"] : [],
      version: "fixture-privacy-gateway/v1",
    };
  }

  assertSafe(result: SanitizationResult): SanitizedCorporateText {
    if (result.sanitizedText === null) {
      throw new Error("Source Document did not pass the Privacy Gateway");
    }

    return result.sanitizedText;
  }
}

export function createPrivacyGateway(): PrivacyGateway {
  return new FixturePrivacyGateway();
}
