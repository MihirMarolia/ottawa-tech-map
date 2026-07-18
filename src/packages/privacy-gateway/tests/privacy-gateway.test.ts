import type {
  CorporateSourceInput,
  PrivacyGateway,
  RawSourceText,
  SanitizationResult,
  SanitizedCorporateText,
} from "../index.js";
import { createPrivacyGateway } from "../index.js";

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

  it("accepts a privacy-safe synthetic Source Document", () => {
    const gateway = createPrivacyGateway();
    const input: CorporateSourceInput = {
      rawText: '{"companyName":"Northstar Civic Systems"}' as RawSourceText,
      sourceUrl: "https://contracts.example/notices/contract-2026-001",
    };

    const result = gateway.sanitize(input);

    expect(result.version).toBe("fixture-privacy-gateway/v1");
    expect(result.redactions).toEqual([]);
    expect(gateway.assertSafe(result)).toBe(input.rawText);
  });

  it("fails closed when sanitization is not verified", () => {
    const gateway = createPrivacyGateway();

    expect(() =>
      gateway.assertSafe({
        sanitizedText: null,
        redactions: ["personal_contact_information"],
        version: "fixture-privacy-gateway/v1",
      }),
    ).toThrow("Source Document did not pass the Privacy Gateway");
  });
});
