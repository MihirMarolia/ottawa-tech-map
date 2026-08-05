import { ottawaDemoDirectory } from "../demo-data.js";
import {
  buildGovernmentIntentRows,
  renderGovernmentIntentMonitor,
} from "../government-intent.js";

describe("Ottawa Government Intent Monitor", () => {
  it("derives transparent categories from recent Evidence", () => {
    const rows = buildGovernmentIntentRows(ottawaDemoDirectory, "2026-08-05");
    expect(rows.find((row) => row.company.canonicalName === "Northstar Civic Systems")).toMatchObject({
      category: "Contract plus current hiring",
      contractCount: 1,
      currentHiringCount: 1,
      securityClearanceHiring: true,
      containsFixtureEvidence: true,
    });
    expect(rows.find((row) => row.company.canonicalName === "Fullscript")).toMatchObject({
      category: "Current hiring without confirmed contract",
      contractCount: 0,
      currentHiringCount: 1,
      containsFixtureEvidence: false,
    });
    expect(rows.find((row) => row.company.canonicalName === "Shopify")?.category).toBe("No recent evidence");
    expect(rows.filter((row) =>
      row.category === "Contract plus current hiring" &&
      row.containsFixtureEvidence,
    ).map((row) => row.company.canonicalName)).toHaveLength(3);

  });

  it("renders methodology, recency, provenance links, and fixture disclosure", () => {
    const html = renderGovernmentIntentMonitor(ottawaDemoDirectory, "2026-08-05");
    expect(html).toContain("last 24 months");
    expect(html).toContain("last 90 days");
    expect(html).toContain("Contains fictional fixture");
    expect(html).toContain("Fullscript");
    expect(html).toContain("/companies/northstar-civic-systems");
    expect(html).not.toContain("CEGI Score");
  });
});
