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

// One figure: a large tabular numeral plus a small caps label, unboxed —
// the interface should look like a number sitting on a page, not a KPI
// card. Muted ink at zero preserves the value as a legitimate data state
// instead of hiding it or dressing it up as a warning.
export function renderStatTile(value: number, label: string): string {
  return `<div class="stat-tile"><span class="value${value === 0 ? " zero" : ""}">${value}</span><span class="label">${escapeHtml(label)}</span></div>`;
}

// One catalogue row: index position, name, description, metadata, and the
// real Evidence count — the directory's primary unit, replacing the card
// grid. Numbering communicates position in the current listing, not rank.
export function renderCompanyRow(index: number, company: DirectoryCompany): string {
  const indexLabel = String(index).padStart(2, "0");
  return `<a class="row" href="/companies/${encodeURIComponent(company.slug)}">
    <span class="row-index">${indexLabel}</span>
    <span class="row-body">
      <span class="row-name">${escapeHtml(company.canonicalName)}</span>
      <span class="row-desc">${escapeHtml(company.shortDescription)}</span>
      <span class="row-meta">${escapeHtml(company.sector)} · ${escapeHtml(company.location)} · ${escapeHtml(company.operatingStatus)}</span>
    </span>
    <span class="row-count"><span class="value${company.evidence.length === 0 ? " zero" : ""}">${company.evidence.length}</span><span class="label">Evidence</span></span>
  </a>`;
}

export type NavDestination = "companies" | "government-intent" | "map";

const NAV_ITEMS: ReadonlyArray<{ id: NavDestination; href: string; label: string }> = [
  { id: "companies", href: "/", label: "Index" },
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
/* Archival research publication, not a SaaS dashboard: warm paper, ink,
   orange as the single structural accent, rules instead of card borders.
   See docs/design/visual-direction.md for the full system and rationale. */
:root{color-scheme:light;
--paper:#F1E4C8;--paper-light:#F7EEDB;--paper-dark:#E5D3B0;
--ink:#241A14;--ink-soft:#55463A;--ink-faint:#6B5A48;
--orange:#C45124;--orange-dark:#8E351A;--orange-light:#D97845;
--rule:#B99F7D;--white:#FFF9EC;
--serif:"Iowan Old Style","Palatino Linotype","Book Antiqua",Georgia,ui-serif,serif;
--sans:-apple-system,"Segoe UI",Roboto,Helvetica,ui-sans-serif,system-ui,sans-serif}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(ellipse 900px 500px at 15% -10%,var(--paper-light),transparent 60%),var(--paper);color:var(--ink);font:16px/1.6 var(--sans)}
a{color:inherit}:focus-visible{outline:2px solid var(--orange);outline-offset:3px;border-radius:2px}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
.shell{width:min(1180px,calc(100% - 32px));margin:auto}
.nav{display:flex;justify-content:space-between;align-items:center;padding:28px 0;border-bottom:1px solid var(--rule)}
.brand{text-decoration:none;font:700 18px/1 var(--serif);letter-spacing:-.01em;color:var(--ink)}
.navlinks{display:flex;gap:28px}
.navlinks a{text-decoration:none;color:var(--ink-soft);font:600 12px/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;padding-bottom:6px;border-bottom:2px solid transparent;transition:.15s color,.15s border-color}
.navlinks a:hover{color:var(--ink)}
.navlinks a[aria-current="page"]{color:var(--orange-dark);border-color:var(--orange)}
.hero{padding:56px 0 40px}
.eyebrow{display:block;color:var(--orange-dark);font:700 11px/1.2 var(--sans);letter-spacing:.14em;text-transform:uppercase;margin:0 0 14px}
.hero h1{font:800 clamp(40px,7vw,84px)/.98 var(--serif);letter-spacing:-.01em;max-width:920px;margin:0 0 20px;color:var(--ink)}
.lede{max-width:680px;color:var(--ink-soft);font-size:18px;margin:0 0 28px}
.meta-line{color:var(--ink-soft);font-size:14px;margin:10px 0}
hr.rule{border:0;border-top:1px solid var(--rule);margin:36px 0}
.filters{display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:12px;padding:18px 0;margin:8px 0 32px;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.filters input,.filters select,.filters button{border:1px solid var(--rule);background:var(--paper-light);color:var(--ink);border-radius:3px;padding:10px 12px;font:14px/1 var(--sans)}
.filters button{background:var(--orange-dark);color:var(--white);font-weight:700;cursor:pointer;border-color:var(--orange-dark);transition:.15s filter}
.filters button:hover{filter:brightness(1.15)}
.checks{display:flex;gap:20px;grid-column:1/-1;color:var(--ink-soft);font-size:13px}
.badge{border:1px solid var(--rule);border-radius:2px;padding:3px 8px;color:var(--ink-soft);font:600 11px/1.4 var(--sans);text-transform:uppercase;letter-spacing:.04em}
.badge.fixture{border-color:var(--orange);color:var(--orange-dark)}
.statgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:20px 0}
.stat-tile{padding-left:20px;border-left:1px solid var(--rule)}
.stat-tile:first-child{padding-left:0;border-left:none}
.stat-tile .value{display:block;font:800 clamp(28px,4vw,40px)/1 var(--serif);font-variant-numeric:tabular-nums;color:var(--ink)}
.stat-tile .value.zero{color:var(--ink-faint)}
.stat-tile .label{display:block;margin-top:8px;font:600 11px/1.4 var(--sans);text-transform:uppercase;letter-spacing:.06em;color:var(--ink-faint)}
.stat{font-size:13px;color:var(--ink-faint);margin-top:16px}
.directory-list{border-top:1px solid var(--rule)}
.row{display:grid;grid-template-columns:40px 1fr auto;gap:20px;align-items:start;padding:20px 0;border-bottom:1px solid var(--rule);text-decoration:none;color:inherit}
.row-index{font:700 13px/1.8 var(--sans);color:var(--ink-faint);font-variant-numeric:tabular-nums}
.row-body{min-width:0}
.row-name{display:block;font:700 21px/1.25 var(--serif);color:var(--ink)}
.row-desc{display:block;color:var(--ink-soft);margin:4px 0}
.row-meta{display:block;color:var(--ink-faint);font-size:13px;text-transform:uppercase;letter-spacing:.03em}
.row:hover .row-name,.row:focus-visible .row-name{color:var(--orange-dark);text-decoration:underline;text-underline-offset:3px}
.row-count{text-align:right;flex-shrink:0}
.row-count .value{display:block;font:800 24px/1 var(--sans);font-variant-numeric:tabular-nums;color:var(--ink)}
.row-count .value.zero{color:var(--ink-faint)}
.row-count .label{display:block;margin-top:4px;font:600 10px/1.3 var(--sans);text-transform:uppercase;letter-spacing:.06em;color:var(--ink-faint)}
.empty{padding:40px 0;text-align:center;color:var(--ink-faint);border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.profileHead{padding:48px 0 8px}
.profileHead h1{font:800 clamp(38px,6vw,64px)/1.05 var(--serif);letter-spacing:-.01em;margin:0 0 12px;color:var(--ink)}
.factlist{margin:20px 0 0}
.factlist div{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid var(--rule);padding:10px 0;font-size:14px}
.factlist dt{color:var(--ink-faint);text-transform:uppercase;letter-spacing:.04em;font-size:12px;margin:0}
.factlist dd{margin:0;color:var(--ink)}
.source{color:var(--orange-dark);font-weight:700;text-decoration:none;border-bottom:1px solid var(--orange-light)}
.source:hover{color:var(--orange)}
.timeline{margin-top:8px}
.citation{padding:20px 0;border-bottom:1px solid var(--rule)}
.citation:first-child{border-top:1px solid var(--rule)}
.cite-head{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;font:700 11px/1.4 var(--sans);text-transform:uppercase;letter-spacing:.06em;color:var(--ink-faint)}
.cite-head .type{color:var(--orange-dark)}
.citation h3{margin:10px 0 6px;font:700 19px/1.3 var(--sans);color:var(--ink)}
.citation p{color:var(--ink-soft);margin:4px 0}
footer{border-top:1px solid var(--rule);margin-top:64px;padding:28px 0 40px;color:var(--ink-faint);font-size:13px}
footer p{margin:6px 0;max-width:640px}
footer strong{color:var(--ink-soft)}
@media(max-width:760px){.filters{grid-template-columns:1fr}.checks{flex-direction:column;gap:8px}.nav{flex-direction:column;align-items:flex-start;gap:14px}.navlinks{gap:16px;flex-wrap:wrap}}
@media(max-width:600px){.row{grid-template-columns:28px 1fr;row-gap:10px}.row-count{grid-column:1/-1;text-align:left;display:flex;gap:10px;align-items:baseline}.row-count .label{margin-top:0}}
</style></head><body><div class="shell"><nav class="nav"><a class="brand" href="/">Ottawa Tech Intelligence</a><div class="navlinks">${navlinks}</div></nav>${content}<footer><p><strong>Ottawa Tech Intelligence</strong> — an evidence-first public directory of the Ottawa technology ecosystem.</p><p>Every figure on this site is derived from Source-backed Evidence on file; fictional test fixtures are labelled wherever they appear. No raw source text, personal contact information, or unpublished content is collected or displayed.</p></footer></div></body></html>`;
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
  const totalEvidence = companies.reduce((sum, company) => sum + company.evidence.length, 0);
  const rows = filtered.map((company, index) => renderCompanyRow(index + 1, company)).join("");
  const sectorOptions = sectors.map((sector) => `<option ${filters.sector === sector ? "selected" : ""}>${escapeHtml(sector)}</option>`).join("");
  return renderPageLayout("Company directory", `<main><section class="hero"><p class="eyebrow">Ottawa evidence index</p><h1>Ottawa's technology companies, documented.</h1><p class="lede">A reviewed Company baseline with the public Source behind every profile. Signal filters show only explicit Evidence.</p>
  <div class="statgrid">${renderStatTile(companies.length, "Companies documented")}${renderStatTile(totalEvidence, "Evidence records")}</div></section>
  <form class="filters" method="get"><input aria-label="Search companies" name="q" value="${escapeHtml(filters.query ?? "")}" placeholder="Search company, domain, or sector"><select aria-label="Sector" name="sector"><option value="">All sectors</option>${sectorOptions}</select><select aria-label="Employee band" name="employeeBand"><option value="">Any employee band</option><option>2–10</option><option>11–50</option><option>51–250</option><option>250+</option></select><button>Search</button><div class="checks"><label><input type="checkbox" name="governmentContract" value="1" ${filters.governmentContract ? "checked" : ""}> Government-contract Evidence</label><label><input type="checkbox" name="activeHiring" value="1" ${filters.activeHiring ? "checked" : ""}> Active hiring Evidence</label></div></form>
  <p class="eyebrow">${filtered.length} Companies</p><div class="directory-list">${rows || '<div class="empty">No Companies match these evidence filters.</div>'}</div></main>`, "companies");
}

function renderEvidence(item: DirectoryEvidence): string {
  const observed = escapeHtml(item.observedAt);
  if (item.kind === "government_contract") return `<article class="citation"><div class="cite-head"><span>${observed}</span><span class="type">Government contract${item.fixture ? " · Fictional test fixture" : ""}</span></div><h3>${escapeHtml(item.contractType)}</h3><p>Awarding organization: ${escapeHtml(item.awardingOrganization)} · Reference: ${escapeHtml(item.externalReference)}</p><p>Observed ${observed} · Confidence ${Math.round(item.confidence * 100)}%</p><a class="source" href="${escapeHtml(item.sourceUrl)}">Source: ${escapeHtml(item.sourceName)}</a></article>`;
  return `<article class="citation"><div class="cite-head"><span>${observed}</span><span class="type">Job posting${item.fixture ? " · Fictional test fixture" : ""}</span></div><h3>${escapeHtml(item.jobTitle)}</h3><p>${escapeHtml(item.location)} · Technologies: ${escapeHtml(item.technologies.join(", ") || "None explicitly named")}</p><p>Security clearance: ${item.securityClearanceRequired ? "Required" : "Not stated"} · Bilingual: ${item.bilingualRequired ? "Required" : "Not stated"}</p><p>Observed ${observed} · Confidence ${Math.round(item.confidence * 100)}%</p><a class="source" href="${escapeHtml(item.sourceUrl)}">Source: ${escapeHtml(item.sourceName)}</a></article>`;
}

export function renderDirectoryCompanyProfile(company: DirectoryCompany | null): string {
  if (!company) return renderPageLayout("Company not found", '<main class="empty"><h1>Company not found</h1><a href="/">Return to directory</a></main>');
  const timelineEvidence = [...company.evidence].sort((a, b) => b.observedAt.localeCompare(a.observedAt)).map(renderEvidence).join("");
  const indicators = summarizeCompanyIndicators(company);
  // Indicator counts derive entirely from company.evidence — showing four zeroed
  // tiles for a Company with no Signals yet reads as broken rather than honest
  // absence. Match the same empty-state convention as the timeline below.
  const indicatorPanel = company.evidence.length === 0 ? "" : `<section><p class="eyebrow">Current indicators · through ${escapeHtml(indicators.referenceDate)}</p>
    <div class="statgrid">${renderStatTile(indicators.jobPostingsObservedLast90Days, "Job postings observed in the last 90 days")}${renderStatTile(indicators.governmentContractsObservedLast24Months, "Government contracts observed in the last 24 months")}${renderStatTile(indicators.securityClearanceRolesDetected, "Recent roles explicitly requiring security clearance")}${renderStatTile(indicators.bilingualRolesDetected, "Recent roles explicitly requiring bilingual capability")}</div>
    <p class="stat">Technologies explicitly mentioned recently: ${escapeHtml(indicators.technologiesRecentlyMentioned.join(", ") || "None")}. Counts use observed Evidence, not inferred Company performance.</p>
  </section>`;
  const evidence = indicatorPanel + timelineEvidence;
  return renderPageLayout(company.canonicalName, `<main><section class="profileHead"><p class="eyebrow">Company profile</p><h1>${escapeHtml(company.canonicalName)}</h1><p class="lede">${escapeHtml(company.shortDescription)}</p><p class="meta-line">${escapeHtml(company.sector)} · ${escapeHtml(company.operatingStatus)}</p></section>
  <hr class="rule"><section><p class="eyebrow">Profile</p><dl class="factlist"><div><dt>Domain</dt><dd>${escapeHtml(company.canonicalDomain)}</dd></div><div><dt>Location</dt><dd>${escapeHtml(company.location)}</dd></div><div><dt>Employees</dt><dd>${escapeHtml(company.employeeBand ?? "Not yet verified")}</dd></div><div><dt>Last verified</dt><dd>${escapeHtml(company.lastVerifiedDate)}</dd></div></dl><p><a class="source" href="${escapeHtml(company.profileSource.url)}">Profile Source: ${escapeHtml(company.profileSource.name)}</a></p></section>
  <hr class="rule"><section><p class="eyebrow">Evidence timeline · ${company.evidence.length} Signals</p><div class="timeline">${evidence || '<div class="empty">No contract or hiring Signals have been added yet. Profile identity remains Source-backed.</div>'}</div></section></main>`, "companies");
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
