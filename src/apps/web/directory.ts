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

const layout = (title: string, content: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} | Ottawa Tech Intelligence</title><style>
:root{color-scheme:dark;--ink:#eef4ff;--muted:#9caec7;--line:#25354a;--panel:#111c2b;--accent:#52e0a4;--blue:#62a8ff;--bg:#07101d}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 85% 0,#132b46 0,transparent 34rem),var(--bg);color:var(--ink);font:16px/1.55 Inter,ui-sans-serif,system-ui,sans-serif}
a{color:inherit}.shell{width:min(1180px,calc(100% - 32px));margin:auto}.nav{display:flex;justify-content:space-between;align-items:center;padding:24px 0}.brand{text-decoration:none;font-weight:800;letter-spacing:-.02em}.navlinks{display:flex;gap:20px;color:var(--muted)}
.hero{padding:64px 0 36px}.eyebrow{color:var(--accent);font:700 12px/1.2 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase}.hero h1{font-size:clamp(40px,7vw,78px);line-height:.98;letter-spacing:-.055em;max-width:900px;margin:14px 0 22px}.lede{max-width:720px;color:var(--muted);font-size:19px}
.panel,.card,.evidence{background:linear-gradient(145deg,rgba(19,32,49,.96),rgba(10,20,34,.96));border:1px solid var(--line);border-radius:18px}.filters{display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:12px;padding:16px;margin:12px 0 28px}.filters input,.filters select,.filters button{border:1px solid #33465e;background:#0a1524;color:var(--ink);border-radius:10px;padding:11px 13px}.filters button{background:var(--accent);color:#04130d;font-weight:800;cursor:pointer}.checks{display:flex;gap:18px;grid-column:1/-1;color:var(--muted)}
.meta{display:flex;flex-wrap:wrap;gap:8px}.badge{border:1px solid #344b65;border-radius:999px;padding:4px 9px;color:#bfd0e6;font-size:12px}.badge.hot{border-color:#247a5a;color:#72efb8}.badge.fixture{border-color:#8a6e2c;color:#ffd879}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}.card{padding:22px;text-decoration:none;transition:.18s transform,.18s border-color}.card:hover{transform:translateY(-3px);border-color:var(--blue)}.card h2{margin:12px 0 6px;font-size:25px;letter-spacing:-.03em}.card p{color:var(--muted)}.stat{font-size:13px;color:var(--muted);margin-top:20px}.empty{padding:50px;text-align:center;color:var(--muted)}
.profileHead{display:grid;grid-template-columns:2fr 1fr;gap:22px;padding:48px 0 24px}.profileHead h1{font-size:clamp(42px,7vw,72px);letter-spacing:-.05em;line-height:1;margin:10px 0}.factlist{padding:22px}.factlist dl{margin:0}.factlist div{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid var(--line);padding:10px 0}.factlist dt{color:var(--muted)}.timeline{display:grid;gap:14px;padding-bottom:60px}.evidence{padding:22px}.evidence h3{margin:8px 0}.evidence p{color:var(--muted)}.source{color:var(--blue)}footer{border-top:1px solid var(--line);margin-top:60px;padding:28px 0;color:var(--muted);font-size:13px}
@media(max-width:760px){.filters,.profileHead{grid-template-columns:1fr}.checks{flex-direction:column;gap:8px}.nav{align-items:flex-start}.navlinks{flex-direction:column;gap:6px}}
</style></head><body><div class="shell"><nav class="nav"><a class="brand" href="/">Ottawa Tech Intelligence</a><div class="navlinks"><a href="/">Companies</a><a href="/government-intent">Government Intent</a><a href="/map">Map</a></div></nav>${content}<footer>Evidence-first Ottawa technology intelligence. Public sources and fictional test fixtures are labelled separately.</footer></div></body></html>`;

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
  return layout("Company directory", `<main><section class="hero"><p class="eyebrow">Ottawa evidence index</p><h1>Find the companies behind Ottawa's technology economy.</h1><p class="lede">Search a reviewed Company baseline and inspect the public Source behind every profile. Signal filters show only explicit evidence.</p></section>
  <form class="filters panel" method="get"><input aria-label="Search companies" name="q" value="${escapeHtml(filters.query ?? "")}" placeholder="Search company, domain, or sector"><select aria-label="Sector" name="sector"><option value="">All sectors</option>${sectorOptions}</select><select aria-label="Employee band" name="employeeBand"><option value="">Any employee band</option><option>2–10</option><option>11–50</option><option>51–250</option><option>250+</option></select><button>Search</button><div class="checks"><label><input type="checkbox" name="governmentContract" value="1" ${filters.governmentContract ? "checked" : ""}> Government-contract Evidence</label><label><input type="checkbox" name="activeHiring" value="1" ${filters.activeHiring ? "checked" : ""}> Active hiring Evidence</label></div></form>
  <p class="eyebrow">${filtered.length} Companies</p><section class="grid">${cards || '<div class="empty panel">No Companies match these evidence filters.</div>'}</section></main>`);
}

function renderEvidence(item: DirectoryEvidence): string {
  if (item.kind === "government_contract") return `<article class="evidence"><div class="meta"><span class="badge hot">Government contract</span>${item.fixture ? '<span class="badge fixture">Fictional test fixture</span>' : ""}</div><h3>${escapeHtml(item.contractType)}</h3><p>Awarding organization: ${escapeHtml(item.awardingOrganization)} · Reference: ${escapeHtml(item.externalReference)}</p><p>Observed ${escapeHtml(item.observedAt)} · Confidence ${Math.round(item.confidence * 100)}%</p><a class="source" href="${escapeHtml(item.sourceUrl)}">Source: ${escapeHtml(item.sourceName)}</a></article>`;
  return `<article class="evidence"><div class="meta"><span class="badge hot">Job posting</span>${item.fixture ? '<span class="badge fixture">Fictional test fixture</span>' : ""}</div><h3>${escapeHtml(item.jobTitle)}</h3><p>${escapeHtml(item.location)} · Technologies: ${escapeHtml(item.technologies.join(", ") || "None explicitly named")}</p><p>Security clearance: ${item.securityClearanceRequired ? "Required" : "Not stated"} · Bilingual: ${item.bilingualRequired ? "Required" : "Not stated"}</p><p>Observed ${escapeHtml(item.observedAt)} · Confidence ${Math.round(item.confidence * 100)}%</p><a class="source" href="${escapeHtml(item.sourceUrl)}">Source: ${escapeHtml(item.sourceName)}</a></article>`;
}

export function renderDirectoryCompanyProfile(company: DirectoryCompany | null): string {
  if (!company) return layout("Company not found", '<main class="empty panel"><h1>Company not found</h1><a href="/">Return to directory</a></main>');
  const evidence = [...company.evidence].sort((a, b) => b.observedAt.localeCompare(a.observedAt)).map(renderEvidence).join("");
  return layout(company.canonicalName, `<main><section class="profileHead"><div><p class="eyebrow">Company intelligence profile</p><h1>${escapeHtml(company.canonicalName)}</h1><p class="lede">${escapeHtml(company.shortDescription)}</p><div class="meta"><span class="badge">${escapeHtml(company.sector)}</span><span class="badge">${escapeHtml(company.operatingStatus)}</span></div></div><aside class="factlist panel"><dl><div><dt>Domain</dt><dd>${escapeHtml(company.canonicalDomain)}</dd></div><div><dt>Location</dt><dd>${escapeHtml(company.location)}</dd></div><div><dt>Employees</dt><dd>${escapeHtml(company.employeeBand ?? "Not yet verified")}</dd></div><div><dt>Last verified</dt><dd>${escapeHtml(company.lastVerifiedDate)}</dd></div></dl><p><a class="source" href="${escapeHtml(company.profileSource.url)}">Profile Source: ${escapeHtml(company.profileSource.name)}</a></p></aside></section><section><p class="eyebrow">Evidence timeline · ${company.evidence.length} Signals</p><div class="timeline">${evidence || '<div class="empty panel">No contract or hiring Signals have been added yet. Profile identity remains Source-backed.</div>'}</div></section></main>`);
}
