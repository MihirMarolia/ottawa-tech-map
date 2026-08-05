import { ottawaDemoDirectory } from "../demo-data.js";
import { renderOttawaCompanyMap } from "../map.js";

describe("Ottawa Company map", () => {
  it("uses the shared Company read projection and links every marker to its profile", () => {
    const html = renderOttawaCompanyMap(ottawaDemoDirectory);

    for (const company of ottawaDemoDirectory) {
      expect(html).toContain(`/companies/${company.slug}`);
      expect(html).toContain(company.canonicalName);
    }
    expect(html).toContain(`${ottawaDemoDirectory.length} mapped Companies`);
    expect(html).toContain("shared read projection");
  });

  it("discloses city-level precision and does not claim street coordinates", () => {
    const html = renderOttawaCompanyMap(ottawaDemoDirectory);

    expect(html).toContain("Location precision: Ottawa city-level");
    expect(html).toContain("visual index, not a claimed street address");
    expect(html).toContain("non-geocoded visual index");
    expect(html).not.toContain("latitude");
    expect(html).not.toContain("longitude");
  });
});

