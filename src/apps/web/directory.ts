export type DirectoryEvidence =
  | {
      kind: "government_contract";
      observedAt: string;
      confidence: number;
      sourceName: string;
      sourceUrl: string;
      awardingOrganization: string;
      contractType: string;
      externalReference: string;
      fixture: boolean;
    }
  | {
      kind: "job_posting";
      observedAt: string;
      confidence: number;
      sourceName: string;
      sourceUrl: string;
      jobTitle: string;
      location: string;
      technologies: ReadonlyArray<string>;
      securityClearanceRequired: boolean;
      bilingualRequired: boolean;
      fixture: boolean;
    };

export type DirectoryCompany = {
  slug: string;
  canonicalName: string;
  canonicalDomain: string;
  location: string;
  sector: string;
  employeeBand: string | null;
  operatingStatus: "active" | "inactive" | "merged";
  shortDescription: string;
  lastVerifiedDate: string;
  profileSource: { name: string; url: string };
  evidence: ReadonlyArray<DirectoryEvidence>;
};

export type DirectoryFilters = {
  query?: string;
  sector?: string;
  employeeBand?: string;
  governmentContract?: boolean;
  activeHiring?: boolean;
};

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

export type NavDestination = "companies" | "government-intent" | "map";

const NAV_ITEMS: ReadonlyArray<{ id: NavDestination; href: string; label: string }> = [
  { id: "companies", href: "/", label: "Companies" },
  { id: "government-intent", href: "/government-intent", label: "Government Intent" },
  { id: "map", href: "/map", label: "Map" },
];

export const renderPageLayout = (title: string, content: string, activeNav?: NavDestination) => {
  const navlinks = NAV_ITEMS.map((item) =>
    `<a href="${item.href}"${item.id === activeNav ? ' aria-current="page"' : ""}>${escapeHtml(item.label)}</a>`,
  ).join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} | Ottawa Tech Intelligence</title><style>
/* Type: a civic-register serif for identity and headlines, a system sans for
   UI and body copy — a deliberate pairing rather than a single default face. */
:root{color-scheme:dark;--ink:#eef4ff;--muted:#9caec7;--line:#25354a;--panel:#111c2b;--accent:#52e0a4;--accent-ink:#04130d;--blue:#62a8ff;--bg:#07101d;--serif:"Iowan Old Style","Palatino Linotype","Book Antiqua",Georgia,ui-serif,serif;--sans:-apple-system,"Segoe UI",Roboto,Helvetica,ui-sans-serif,system-ui,sans-serif}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 85% 0,#132b46 0,transparent 34rem),var(--bg);color:var(--ink);font:16px/1.6 var(--sans)}
a{color:inherit}:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:4px}
.shell{width:min(1180px,calc(100% - 32px));margin:auto}.nav{display:flex;justify-content:space-between;align-items:center;padding:26px 0;border-bottom:1px solid var(--line)}.brand{text-decoration:none;font:700 19px/1 var(--serif);letter-spacing:-.01em}
.navlinks{display:flex;gap:24px}.navlinks a{text-decoration:none;color:var(--muted);font:600 13px/1 var(--sans);letter-spacing:.02em;padding:6px 0 8px;border-bottom:2px solid transparent;transition:.15s color,.15s border-color}.navlinks a:hover{color:var(--ink)}.navlinks a[aria-current="page"]{color:var(--ink);border-color:var(--accent)}
.hero{padding:64px 0 36px}.eyebrow{position:relative;display:inline-block;padding-left:20px;color:var(--accent);font:700 12px/1.2 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase}.eyebrow::before{content:"";position:absolute;left:0;top:50%;width:14px;height:2px;background:var(--accent);transform:translateY(-50%)}
.hero h1{font:800 clamp(40px,7vw,76px)/1.03 var(--serif);letter-spacing:-.015em;max-width:900px;margin:18px 0 22px}.lede{max-width:720px;color:var(--muted);font-size:19px}
.panel,.card{background:linear-gradient(145deg,rgba(19,32,49,.96),rgba(10,20,34,.96));border:1px solid var(--line);border-radius:16px}.filters{display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:12px;padding:16px;margin:12px 0 28px}.filters input,.filters select,.filters button{border:1px solid #33465e;background:#0a1524;color:var(--ink);border-radius:10px;padding:11px 13px;font:14px/1 var(--sans)}.filters button{background:var(--accent);color:var(--accent-ink);font-weight:700;cursor:pointer;border-color:transparent;transition:.15s filter}.filters button:hover{filter:brightness(1.08)}.checks{display:flex;gap:18px;grid-column:1/-1;color:var(--muted);font-size:14px}
.meta{display:flex;flex-wrap:wrap;gap:8px}.badge{border:1px solid #344b65;border-radius:999px;padding:4px 10px;color:#bfd0e6;font:600 12px/1.4 var(--sans)}.badge.hot{border-color:#247a5a;color:#72efb8}.badge.fixture{border-color:#8a6e2c;color:#ffd879}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}.card{padding:24px;text-decoration:none;display:block;transition:.18s transform,.18s border-color,.18s box-shadow}.card:hover,.card:focus-visible{transform:translateY(-3px);border-color:var(--blue);box-shadow:0 12px 28px -16px rgba(0,20,60,.6)}.card h2{margin:14px 0 6px;font:700 24px/1.15 var(--serif);letter-spacing:-.01em}.card p{color:var(--muted)}.stat{font-size:13px;color:var(--muted);margin-top:20px}.empty{padding:50px;text-align:center;color:var(--muted)}
.profileHead{display:grid;grid-template-columns:2fr 1fr;gap:22px;padding:48px 0 24px}.profileHead h1{font:800 clamp(40px,7vw,68px)/1.05 var(--serif);letter-spacing:-.01em;margin:12px 0}.factlist{padding:22px}.factlist dl{margin:0}.factlist div{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid var(--line);padding:10px 0;font-size:14px}.factlist dt{color:var(--muted)}
.timeline{display:grid;gap:14px;padding-bottom:60px}.evidence{background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:10px;padding:22px}.evidence h3{margin:8px 0;font:700 18px/1.3 var(--sans)}.evidence p{color:var(--muted)}.source{color:var(--blue);font-weight:600}
footer{border-top:1px solid var(--line);margin-top:60px;padding:28px 0;color:var(--muted);font-size:13px}
@media(max-width:760px){.filters,.profileHead{grid-template-columns:1fr}.checks{flex-direction:column;gap:8px}.nav{align-items:flex-start;flex-direction:column;gap:12px}.navlinks{gap:16px}}
</style></head><body><div class="shell"><nav class="nav"><a class="brand" href="/">Ottawa Tech Intelligence</a><div class="navlinks">${navlinks}</div></nav>${content}<footer>Evidence-first Ottawa technology intelligence. Public sources and fictional test fixtures are labelled separately.</footer></div></body></html>`;
};

const latestEvidenceDate = (company: DirectoryCompany) =>
  company.evidence.map((item) => item.observedAt).sort().at(-1) ?? company.lastVerifiedDate;

export function filterDirectory(companies: ReadonlyArray<DirectoryCompany>, filters: DirectoryFilters): DirectoryCompany[] {
  const query = filters.query?.trim().toLowerCase() ?? "";
  return companies.filter((company) =>
    (query === "" || [company.canonicalName, company.canonicalDomain, company.shortDescription, company.sector].some((value) => value.toLowerCase().includes(query))) &&
    (!filters.sector || company.sector === filters.sector) &&
    (!filters.employeeBand || company.employeeBand === filters.employeeBand) &&
    (!filters.governmentContract || company.evidence.some((item) => item.kind === "government_contract")) &&
    (!filters.activeHiring || company.evidence.some((item) => item.kind === "job_posting"))
  ).sort((left, right) => latestEvidenceDate(right).localeCompare(latestEvidenceDate(left)) || left.canonicalName.localeCompare(right.canonicalName));
}

export function renderCompanyDirectory(companies: ReadonlyArray<DirectoryCompany>, filters: DirectoryFilters = {}): string {
  const filtered = filterDirectory(companies, filters);
  const sectors = [...new Set(companies.map((company) => company.sector))].sort();
  const cards = filtered.map((company) => {
    const contracts = company.evidence.filter((item) => item.kind === "government_contract").length;
    const jobs = company.evidence.filter((item) => item.kind === "job_posting").length;
    return `<a class="card" href="/companies/${encodeURIComponent(company.slug)}">
      <div class="meta"><span class="badge">${escapeHtml(company.sector)}</span>${contracts ? `<span class="badge hot">${contracts} contract Signal</span>` : ""}${jobs ? `<span class="badge hot">${jobs} hiring Signal</span>` : ""}</div>
      <h2>${escapeHtml(company.canonicalName)}</h2><p>${escapeHtml(company.shortDescription)}</p>
      <div class="stat">${escapeHtml(company.location)} · Latest Evidence ${escapeHtml(latestEvidenceDate(company))}</div>
    </a>`;
  }).join("");
  const sectorOptions = sectors.map((sector) => `<option ${filters.sector === sector ? "selected" : ""}>${escapeHtml(sector)}</option>`).join("");
  return renderPageLayout("Company directory", `<main><section class="hero"><p class="eyebrow">Ottawa evidence index</p><h1>Find the companies behind Ottawa's technology economy.</h1><p class="lede">Search a reviewed Company baseline and inspect the public Source behind every profile. Signal filters show only explicit evidence.</p></section>
  <form class="filters panel" method="get"><input aria-label="Search companies" name="q" value="${escapeHtml(filters.query ?? "")}" placeholder="Search company, domain, or sector"><select aria-label="Sector" name="sector"><option value="">All sectors</option>${sectorOptions}</select><select aria-label="Employee band" name="employeeBand"><option value="">Any employee band</option><option>2–10</option><option>11–50</option><option>51–250</option><option>250+</option></select><button>Search</button><div class="checks"><label><input type="checkbox" name="governmentContract" value="1" ${filters.governmentContract ? "checked" : ""}> Government-contract Evidence</label><label><input type="checkbox" name="activeHiring" value="1" ${filters.activeHiring ? "checked" : ""}> Active hiring Evidence</label></div></form>
  <p class="eyebrow">${filtered.length} Companies</p><section class="grid">${cards || '<div class="empty panel">No Companies match these evidence filters.</div>'}</section></main>`, "companies");
}

function renderEvidence(item: DirectoryEvidence): string {
  if (item.kind === "government_contract") return `<article class="evidence"><div class="meta"><span class="badge hot">Government contract</span>${item.fixture ? '<span class="badge fixture">Fictional test fixture</span>' : ""}</div><h3>${escapeHtml(item.contractType)}</h3><p>Awarding organization: ${escapeHtml(item.awardingOrganization)} · Reference: ${escapeHtml(item.externalReference)}</p><p>Observed ${escapeHtml(item.observedAt)} · Confidence ${Math.round(item.confidence * 100)}%</p><a class="source" href="${escapeHtml(item.sourceUrl)}">Source: ${escapeHtml(item.sourceName)}</a></article>`;
  return `<article class="evidence"><div class="meta"><span class="badge hot">Job posting</span>${item.fixture ? '<span class="badge fixture">Fictional test fixture</span>' : ""}</div><h3>${escapeHtml(item.jobTitle)}</h3><p>${escapeHtml(item.location)} · Technologies: ${escapeHtml(item.technologies.join(", ") || "None explicitly named")}</p><p>Security clearance: ${item.securityClearanceRequired ? "Required" : "Not stated"} · Bilingual: ${item.bilingualRequired ? "Required" : "Not stated"}</p><p>Observed ${escapeHtml(item.observedAt)} · Confidence ${Math.round(item.confidence * 100)}%</p><a class="source" href="${escapeHtml(item.sourceUrl)}">Source: ${escapeHtml(item.sourceName)}</a></article>`;
}

export function renderDirectoryCompanyProfile(company: DirectoryCompany | null): string {
  if (!company) return renderPageLayout("Company not found", '<main class="empty panel"><h1>Company not found</h1><a href="/">Return to directory</a></main>');
  const timelineEvidence = [...company.evidence].sort((a, b) => b.observedAt.localeCompare(a.observedAt)).map(renderEvidence).join("");
  const indicators = summarizeCompanyIndicators(company);
  // Indicator counts derive entirely from company.evidence — showing four zeroed
  // tiles for a Company with no Signals yet reads as broken rather than honest
  // absence. Match the same empty-state convention as the timeline below.
  const indicatorPanel = company.evidence.length === 0 ? "" : `<section><p class="eyebrow">Current indicators · through ${escapeHtml(indicators.referenceDate)}</p>
    <div class="grid"><article class="evidence"><h3>${indicators.jobPostingsObservedLast90Days}</h3><p>Job postings observed in the last 90 days</p></article>
    <article class="evidence"><h3>${indicators.governmentContractsObservedLast24Months}</h3><p>Government contracts observed in the last 24 months</p></article>
    <article class="evidence"><h3>${indicators.securityClearanceRolesDetected}</h3><p>Recent roles explicitly requiring security clearance</p></article>
    <article class="evidence"><h3>${indicators.bilingualRolesDetected}</h3><p>Recent roles explicitly requiring bilingual capability</p></article></div>
    <p class="stat">Technologies explicitly mentioned recently: ${escapeHtml(indicators.technologiesRecentlyMentioned.join(", ") || "None")}. Counts use observed Evidence, not inferred Company performance.</p>
  </section>`;
  const evidence = indicatorPanel + timelineEvidence;
  return renderPageLayout(company.canonicalName, `<main><section class="profileHead"><div><p class="eyebrow">Company intelligence profile</p><h1>${escapeHtml(company.canonicalName)}</h1><p class="lede">${escapeHtml(company.shortDescription)}</p><div class="meta"><span class="badge">${escapeHtml(company.sector)}</span><span class="badge">${escapeHtml(company.operatingStatus)}</span></div></div><aside class="factlist panel"><dl><div><dt>Domain</dt><dd>${escapeHtml(company.canonicalDomain)}</dd></div><div><dt>Location</dt><dd>${escapeHtml(company.location)}</dd></div><div><dt>Employees</dt><dd>${escapeHtml(company.employeeBand ?? "Not yet verified")}</dd></div><div><dt>Last verified</dt><dd>${escapeHtml(company.lastVerifiedDate)}</dd></div></dl><p><a class="source" href="${escapeHtml(company.profileSource.url)}">Profile Source: ${escapeHtml(company.profileSource.name)}</a></p></aside></section><section><p class="eyebrow">Evidence timeline · ${company.evidence.length} Signals</p><div class="timeline">${evidence || '<div class="empty panel">No contract or hiring Signals have been added yet. Profile identity remains Source-backed.</div>'}</div></section></main>`, "companies");
}
export type DirectoryIndicators = {
  jobPostingsObservedLast90Days: number;
  governmentContractsObservedLast24Months: number;
  securityClearanceRolesDetected: number;
  bilingualRolesDetected: number;
  technologiesRecentlyMentioned: ReadonlyArray<string>;
  referenceDate: string;
};

function dateBefore(referenceDate: string, months: number, days: number): string {
  const date = new Date(`${referenceDate}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - months);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function summarizeCompanyIndicators(company: DirectoryCompany): DirectoryIndicators {
  const jobCutoff = dateBefore(company.lastVerifiedDate, 0, 90);
  const contractCutoff = dateBefore(company.lastVerifiedDate, 24, 0);
  const recentJobs = company.evidence.filter(
    (item): item is Extract<DirectoryEvidence, { kind: "job_posting" }> =>
      item.kind === "job_posting" && item.observedAt >= jobCutoff &&
      item.observedAt <= company.lastVerifiedDate,
  );
  return {
    jobPostingsObservedLast90Days: recentJobs.length,
    governmentContractsObservedLast24Months: company.evidence.filter(
      (item) => item.kind === "government_contract" &&
        item.observedAt >= contractCutoff && item.observedAt <= company.lastVerifiedDate,
    ).length,
    securityClearanceRolesDetected: recentJobs.filter((item) => item.securityClearanceRequired).length,
    bilingualRolesDetected: recentJobs.filter((item) => item.bilingualRequired).length,
    technologiesRecentlyMentioned: [...new Set(recentJobs.flatMap((item) => item.technologies))].sort(),
    referenceDate: company.lastVerifiedDate,
  };
}
