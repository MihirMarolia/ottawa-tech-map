import type {
  CorporateSourceInput,
  PrivacyGateway,
  SanitizationResult,
  SanitizedCorporateText,
} from "../index.js";

describe("PrivacyGateway contract", () => {
  it("accepts the public interface shape", () => {
    const gateway: PrivacyGateway = {
      sanitize: (_input: CorporateSourceInput): SanitizationResult => ({
        sanitizedText: null,
        redactions: [],
        version: "0",
      }),
      assertSafe: (_result: SanitizationResult): SanitizedCorporateText => {
        return "sanitized" as SanitizedCorporateText;
      },
    };

    expect(gateway.sanitize).toBeDefined();
    expect(gateway.assertSafe).toBeDefined();
  });
});
