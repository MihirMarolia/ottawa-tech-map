import { describe, expect, it } from "vitest";
import {
  renderCompanyProfile,
  renderDiscovery,
  renderSearchResults,
  renderMap,
  renderReviewQueue,
} from "../index.js";

describe("web intelligence views", () => {
  it("makes discovery search-first and keeps the map secondary", () => {
    const html = renderDiscovery();

    expect(html).toContain("Find the companies shaping Ottawa’s tech ecosystem.");
    expect(html).toContain('name="q"');
    expect(html).toContain("Search uses the indexed company records");
    expect(html).toContain('href="/map"');
    expect(html).toContain("Search the indexed company records");
  });

  it("renders searchable company result cards with only supplied signals", () => {
    const html = renderSearchResults("civic", [{
      canonicalName: "Example Systems",
      canonicalDomain: "example.ca",
      evidenceCount: 2,
      offeringCount: 1,
      latestObservedAt: "2026-08-16",
    }]);

    expect(html).toContain("1 company found");
    expect(html).toContain("Example Systems");
    expect(html).toContain("2 signals");
    expect(html).toContain("1 offering");
    expect(html).toContain("/companies/example.ca");
  });

  it("keeps no-match and search-error states explicit", () => {
    expect(renderSearchResults("unknown", [])).toContain("No companies matched");
    expect(renderSearchResults("unknown", [], "Search backend unavailable")).toContain("Search is unavailable");
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

  it("renders verified offerings with provenance and honest empty sections", () => {
    const html = renderCompanyProfile({
      company: { canonicalName: "Example Systems", canonicalDomain: "example.ca" },
      products: [{
        name: "Civic Data Platform",
        description: "A supported description from a primary source.",
        status: "active",
        evidence: [{
          signalType: "product_added",
          observedAt: "2026-08-16",
          evidenceType: "official_product_page",
          confidence: 0.99,
          source: { name: "Example product page", url: "https://example.ca/product" },
        }],
      }],
      services: [],
      evidence: [],
    });

    expect(html).toContain("What they offer");
    expect(html).toContain("Civic Data Platform");
    expect(html).toContain("Example product page");
    expect(html).toContain("No service information has been verified from available primary sources.");
  });

  it("keeps the map secondary and honest when geographic data is unavailable", () => {
    const html = renderMap();

    expect(html).toContain("The map is not available yet.");
    expect(html).toContain("verified geographic records");
    expect(html).toContain('href="/"');
  });

  it("makes an empty review queue explicit", () => {
    const html = renderReviewQueue([]);

    expect(html).toContain("Nothing needs review");
    expect(html).toContain("There are no unresolved entity matches");
  });
});
