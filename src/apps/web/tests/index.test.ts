import { describe, expect, it } from "vitest";
import {
  renderCompanyProfile,
  renderDiscovery,
  renderReviewQueue,
} from "../index.js";

describe("web intelligence views", () => {
  it("makes discovery search-first and keeps the map secondary", () => {
    const html = renderDiscovery();

    expect(html).toContain("Find the companies shaping Ottawa’s tech ecosystem.");
    expect(html).toContain('name="q"');
    expect(html).toContain("Search uses the indexed company records");
    expect(html).toContain('href="/map"');
    expect(html).toContain("Search results will appear here");
  });

  it("explains signal confidence and preserves the provenance path", () => {
    const html = renderCompanyProfile({
      company: { canonicalName: "Example Systems", canonicalDomain: "example.ca" },
      evidence: [
        {
          contractType: "professional_services",
          observedAt: "2026-06-30",
          confidence: 0.98,
          source: { name: "Public source", url: "https://example.ca/source" },
        },
      ],
    });

    expect(html).toContain("98% validation confidence");
    expect(html).toContain("Confidence describes the signal, not the company.");
    expect(html).toContain("Provenance:");
    expect(html).toContain("open original source");
  });

  it("does not fill missing evidence with invented content", () => {
    const html = renderCompanyProfile({
      company: { canonicalName: "Evidence-light Company", canonicalDomain: "example.ca" },
      evidence: [],
    });

    expect(html).toContain("No published evidence is available yet");
    expect(html).toContain("Nothing has been inferred or filled in.");
    expect(html).not.toContain("Government contract awarded");
  });

  it("makes an empty review queue explicit", () => {
    const html = renderReviewQueue([]);

    expect(html).toContain("Nothing needs review");
    expect(html).toContain("There are no unresolved entity matches");
  });
});
