import type { OfferingObservationFixture } from "../../offering-observation-fixtures.js";

/**
 * Sanitized test fixture derived from research/ticket-08/final-approved-corpus.yml.
 * It deliberately contains no raw source content and is imported by tests only.
 */
export const finalApprovedOfferingObservations: ReadonlyArray<OfferingObservationFixture> = [
  {
    fixtureId: "t08c-kinaxis-maestro",
    company: { name: "Kinaxis", domain: "kinaxis.com" },
    classification: "product",
    canonicalName: "Kinaxis Maestro",
    sources: [{ sourceRecordId: "t08b-001", sourceName: "Kinaxis", sourceUrl: "https://www.kinaxis.com/en/solutions/platform", observedAt: "2026-08-18", evidenceType: "official_product_page", confidence: 0.98 }],
  },
  {
    fixtureId: "t08c-mindbridge-ai",
    company: { name: "MindBridge", domain: "mindbridge.ai" },
    classification: "product",
    canonicalName: "MindBridge AI",
    sources: [{ sourceRecordId: "t08b-004", sourceName: "MindBridge", sourceUrl: "https://www.mindbridge.ai/", observedAt: "2026-08-18", evidenceType: "official_company_page", confidence: 0.98 }],
  },
  {
    fixtureId: "t08c-solink-ai",
    company: { name: "Solink", domain: "solink.com" },
    classification: "product",
    canonicalName: "Solink AI",
    sources: [{ sourceRecordId: "t08b-008", sourceName: "Solink", sourceUrl: "https://solink.com/ai/", observedAt: "2026-08-18", evidenceType: "official_product_page", confidence: 0.98 }],
  },
  {
    fixtureId: "t08c-solink-cloud-vms",
    company: { name: "Solink", domain: "solink.com" },
    classification: "product",
    canonicalName: "Solink Cloud VMS",
    sources: [{ sourceRecordId: "t08b-009", sourceName: "Solink", sourceUrl: "https://solink.com/cloud-video-management-system/", observedAt: "2026-08-18", evidenceType: "official_product_page", confidence: 0.98 }],
  },
  {
    fixtureId: "t08c-solink-video-alarms",
    company: { name: "Solink", domain: "solink.com" },
    classification: "product",
    canonicalName: "Solink Video Alarms",
    sources: [{ sourceRecordId: "t08b-010", sourceName: "Solink", sourceUrl: "https://solink.com/video-alarms/", observedAt: "2026-08-18", evidenceType: "official_product_page", confidence: 0.98 }],
  },
  {
    fixtureId: "t08c-assent-network",
    company: { name: "Assent", domain: "assent.com" },
    classification: "product",
    canonicalName: "Assent Network",
    sources: [{ sourceRecordId: "t08b-011", sourceName: "Assent", sourceUrl: "https://www.assent.com/", observedAt: "2026-08-18", evidenceType: "official_company_page", confidence: 0.98 }],
  },
  {
    fixtureId: "t08c-field-effect-mdr",
    company: { name: "Field Effect", domain: "fieldeffect.com" },
    classification: "service",
    canonicalName: "Field Effect Managed Detection and Response",
    sources: [{ sourceRecordId: "t08b-013", sourceName: "Field Effect", sourceUrl: "https://fieldeffect.com/", observedAt: "2026-08-18", evidenceType: "official_company_page", confidence: 0.98 }],
  },
  {
    fixtureId: "t08c-rewind-shopify-backups",
    company: { name: "Rewind", domain: "rewind.com" },
    classification: "product",
    canonicalName: "Rewind Backups for Shopify",
    sources: [{ sourceRecordId: "t08b-017", sourceName: "Rewind", sourceUrl: "https://rewind.com/products/backups/shopify/", observedAt: "2026-08-18", evidenceType: "official_product_page", confidence: 0.98 }],
  },
  {
    fixtureId: "t08c-rewind-protection-suite",
    company: { name: "Rewind", domain: "rewind.com" },
    classification: "product",
    canonicalName: "Rewind Protection Suite",
    sources: [{ sourceRecordId: "t08b-018", sourceName: "Rewind", sourceUrl: "https://rewind.com/products/protection-suite/", observedAt: "2026-08-18", evidenceType: "official_product_page", confidence: 0.98 }],
  },
  {
    fixtureId: "t08c-truecontext-field-service-intelligence",
    company: { name: "TrueContext", domain: "truecontext.com" },
    classification: "product",
    canonicalName: "TrueContext Field Service Intelligence Platform",
    sources: [{ sourceRecordId: "t08b-022", sourceName: "TrueContext", sourceUrl: "https://truecontext.com/product/low-code-app-platform/", observedAt: "2026-08-18", evidenceType: "official_product_page", confidence: 0.98 }],
  },
  {
    fixtureId: "t08c-versaterm-rms",
    company: { name: "Versaterm", domain: "versaterm.com" },
    classification: "product",
    canonicalName: "Versaterm RMS",
    sources: [{ sourceRecordId: "t08b-027", sourceName: "Versaterm", sourceUrl: "https://www.versaterm.com/solution/rms/", observedAt: "2026-08-18", evidenceType: "official_product_page", confidence: 0.98 }],
  },
  {
    fixtureId: "t08c-versaterm-cad",
    company: { name: "Versaterm", domain: "versaterm.com" },
    classification: "product",
    canonicalName: "Versaterm CAD",
    sources: [{ sourceRecordId: "t08b-028", sourceName: "Versaterm", sourceUrl: "https://www.versaterm.com/solution/cad/", observedAt: "2026-08-18", evidenceType: "official_product_page", confidence: 0.98 }],
  },
];
