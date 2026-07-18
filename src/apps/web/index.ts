type CompanyProfileView = {
  company: {
    canonicalName: string;
    canonicalDomain: string;
  };
  evidence: ReadonlyArray<{
    contractType: "professional_services";
    observedAt: string;
    confidence: number;
    source: {
      name: string;
      url: string;
    };
  }>;
} | null;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function presentContractType(contractType: "professional_services"): string {
  return contractType === "professional_services"
    ? "Professional services"
    : contractType;
}

export function renderCompanyProfile(profile: CompanyProfileView): string {
  if (profile === null) {
    return "<!doctype html><html><body><main><h1>Company not found</h1></main></body></html>";
  }

  const evidence = profile.evidence
    .map(
      (item) => `<article class="evidence">
        <h2>Government contract awarded</h2>
        <dl>
          <dt>Contract type</dt><dd>${presentContractType(item.contractType)}</dd>
          <dt>Observed</dt><dd><time datetime="${escapeHtml(item.observedAt)}">${escapeHtml(item.observedAt)}</time></dd>
          <dt>Confidence</dt><dd>${Math.round(item.confidence * 100)}%</dd>
          <dt>Source</dt><dd><a href="${escapeHtml(item.source.url)}">${escapeHtml(item.source.name)}</a></dd>
        </dl>
      </article>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>${escapeHtml(profile.company.canonicalName)} — Company profile</title></head>
  <body>
    <main>
      <header><p>Company profile</p><h1>${escapeHtml(profile.company.canonicalName)}</h1><p>${escapeHtml(profile.company.canonicalDomain)}</p></header>
      <section aria-labelledby="evidence-heading"><h2 id="evidence-heading">Evidence</h2>${evidence}</section>
    </main>
  </body>
</html>`;
}
