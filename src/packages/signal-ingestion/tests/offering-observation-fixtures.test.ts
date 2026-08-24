import { describe, expect, it } from "vitest";
import { prepareOfferingObservationFixture } from "../index.js";
import { finalApprovedOfferingObservations } from "./fixtures/final-approved-offering-observations.js";

describe("fixture-only offering observations", () => {
  it("derives proposal commands for exactly the twelve approved 08B offerings", () => {
    const prepared = finalApprovedOfferingObservations.map(
      prepareOfferingObservationFixture,
    );

    expect(prepared).toHaveLength(12);
    expect(prepared.every((item) => item.status === "ready")).toBe(true);

    const commands = prepared.flatMap((item) =>
      item.status === "ready" ? item.commands : [],
    );
    expect(commands).toHaveLength(12);
    expect(commands.filter((command) => command.kind === "product")).toHaveLength(11);
    expect(commands.filter((command) => command.kind === "service")).toHaveLength(1);
    expect(commands.map((command) => command.name)).toEqual(expect.arrayContaining([
      "Kinaxis Maestro",
      "Field Effect Managed Detection and Response",
      "Versaterm CAD",
    ]));
  });

  it("routes an unknown observation classification to review without a proposal command", () => {
    const prepared = prepareOfferingObservationFixture({
      fixtureId: "unknown-offering-kind",
      company: { name: "Unknown Classification Systems", domain: "unknown-kind.example" },
      classification: "unknown",
      canonicalName: "Ambiguous Offering",
      sources: [{
        sourceRecordId: "synthetic-unknown-kind",
        sourceName: "Official company page",
        sourceUrl: "https://unknown-kind.example/offerings",
        observedAt: "2026-08-18",
        evidenceType: "official_company_page",
        confidence: 0.8,
      }],
    });

    expect(prepared).toEqual({
      status: "review_required",
      fixtureId: "unknown-offering-kind",
      reason: "unknown_offering_classification",
    });
  });

  it("emits multiple provenance commands for corroborating source records without changing offering identity", () => {
    const prepared = prepareOfferingObservationFixture({
      fixtureId: "corroborated-product",
      company: { name: "Fixture Systems", domain: "fixture-systems.example" },
      classification: "product",
      canonicalName: "Evidence-Backed Product",
      sources: [
        {
          sourceRecordId: "primary-source",
          sourceName: "Official product page",
          sourceUrl: "https://fixture-systems.example/product",
          observedAt: "2026-08-18",
          evidenceType: "official_product_page",
          confidence: 0.98,
        },
        {
          sourceRecordId: "corroborating-source",
          sourceName: "Official documentation",
          sourceUrl: "https://fixture-systems.example/docs/product",
          observedAt: "2026-08-18",
          evidenceType: "official_documentation",
          confidence: 0.95,
        },
      ],
    });

    expect(prepared.status).toBe("ready");
    if (prepared.status !== "ready") return;
    expect(prepared.commands).toHaveLength(2);
    expect(new Set(prepared.commands.map((command) => command.kind))).toEqual(new Set(["product"]));
    expect(new Set(prepared.commands.map((command) => command.name))).toEqual(new Set(["Evidence-Backed Product"]));
  });
});
