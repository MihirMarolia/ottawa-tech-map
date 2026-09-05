import type { DirectoryCompany } from "./directory.js";
import { renderPageLayout } from "./directory.js";

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

const sectorColor = (sector: string) => {
  const colors = ["#52e0a4", "#62a8ff", "#f4c95d", "#d88cff", "#ff8b75"];
  let hash = 0;
  for (const character of sector) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return colors[hash % colors.length] ?? colors[0];
};

export function renderOttawaCompanyMap(companies: ReadonlyArray<DirectoryCompany>): string {
  const sorted = [...companies].sort((left, right) => left.canonicalName.localeCompare(right.canonicalName));
  const pins = sorted.map((company, index) => {
    const angle = (index / Math.max(sorted.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const ring = 118 + (index % 3) * 25;
    const x = Math.round(330 + Math.cos(angle) * ring);
    const y = Math.round(235 + Math.sin(angle) * ring * 0.65);
    return `<a href="/companies/${encodeURIComponent(company.slug)}" aria-label="Open ${escapeHtml(company.canonicalName)} Company profile">
      <circle cx="${x}" cy="${y}" r="13" fill="${sectorColor(company.sector)}"><title>${escapeHtml(company.canonicalName)} · ${escapeHtml(company.sector)}</title></circle>
      <text x="${x}" y="${y + 30}" text-anchor="middle">${escapeHtml(company.canonicalName)}</text>
    </a>`;
  }).join("");

  const list = sorted.map((company) => `<a class="card" href="/companies/${encodeURIComponent(company.slug)}">
    <div class="meta"><span class="badge" style="border-color:${sectorColor(company.sector)}">${escapeHtml(company.sector)}</span></div>
    <h2>${escapeHtml(company.canonicalName)}</h2>
    <p>${escapeHtml(company.location)} · ${company.evidence.length} Evidence record${company.evidence.length === 1 ? "" : "s"}</p>
  </a>`).join("");

  return renderPageLayout("Ottawa Company map", `<main>
    <section class="hero"><p class="eyebrow">Ottawa exploration</p><h1>Explore the reviewed Company baseline.</h1>
    <p class="lede">Every marker opens the same Company profile used by directory search. The current public baseline supports city-level location only.</p></section>
    <section class="panel" style="padding:18px">
      <p class="badge fixture" style="display:inline-block">Location precision: Ottawa city-level</p>
      <p style="color:var(--muted)">Marker spacing is a visual index, not a claimed street address or geographic coordinate. Exact locations will appear only when Source-backed location Evidence is available.</p>
      <svg viewBox="0 0 660 470" role="img" aria-labelledby="map-title map-description" style="display:block;width:100%;min-height:390px;background:radial-gradient(circle at 50% 50%,#153653,#0a1524 62%);border:1px solid var(--line);border-radius:14px">
        <title id="map-title">Ottawa city-level Company map</title>
        <desc id="map-description">A non-geocoded visual index of ${sorted.length} Companies known to operate in Ottawa.</desc>
        <path d="M80 245 Q150 90 330 70 Q520 80 585 230 Q535 390 330 410 Q125 390 80 245Z" fill="none" stroke="#334d69" stroke-width="2"/>
        <circle cx="330" cy="235" r="46" fill="#102c43" stroke="#62a8ff" stroke-width="2"/>
        <text x="330" y="230" text-anchor="middle" fill="#eef4ff" font-size="18" font-weight="700">OTTAWA</text>
        <text x="330" y="252" text-anchor="middle" fill="#9caec7" font-size="12">city-level placement</text>
        <g fill="#eef4ff" font-family="system-ui,sans-serif" font-size="10">${pins}</g>
      </svg>
    </section>
    <section style="padding-top:32px"><p class="eyebrow">${sorted.length} mapped Companies · shared read projection</p><div class="grid">${list}</div></section>
  </main>`, "map");
}

