import type { DirectoryCompany } from "./directory.js";
import { renderCompanyRow, renderPageLayout } from "./directory.js";

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

export function renderOttawaCompanyMap(companies: ReadonlyArray<DirectoryCompany>): string {
  const sorted = [...companies].sort((left, right) => left.canonicalName.localeCompare(right.canonicalName));
  // Pin radius reports observed Evidence volume, not company size or rank —
  // a magnitude-sized orange mark per Company, the same idea as a
  // Feltron-style dot map, grounded only in Signals actually on file.
  const maxEvidence = Math.max(1, ...sorted.map((company) => company.evidence.length));
  const pins = sorted.map((company, index) => {
    const angle = (index / Math.max(sorted.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const ring = 118 + (index % 3) * 25;
    const x = Math.round(330 + Math.cos(angle) * ring);
    const y = Math.round(235 + Math.sin(angle) * ring * 0.65);
    const radius = Math.round(7 + (company.evidence.length / maxEvidence) * 9);
    return `<a href="/companies/${encodeURIComponent(company.slug)}" aria-label="Open ${escapeHtml(company.canonicalName)} Company profile — ${company.evidence.length} Evidence record${company.evidence.length === 1 ? "" : "s"}">
      <circle cx="${x}" cy="${y}" r="${radius}" fill="#C45124" fill-opacity="0.82"><title>${escapeHtml(company.canonicalName)} · ${escapeHtml(company.sector)} · ${company.evidence.length} Evidence record${company.evidence.length === 1 ? "" : "s"}</title></circle>
      <text x="${x}" y="${y + radius + 15}" text-anchor="middle">${escapeHtml(company.canonicalName)}</text>
    </a>`;
  }).join("");

  const rows = sorted.map((company, index) => renderCompanyRow(index + 1, company)).join("");

  return renderPageLayout("Ottawa Company map", `<main>
    <section class="hero"><p class="eyebrow">Ottawa exploration</p><h1>Explore the reviewed Company baseline.</h1>
    <p class="lede">Every marker opens the same Company profile used by directory search. The current public baseline supports city-level location only.</p></section>
    <section>
      <p class="badge fixture" style="display:inline-block">Location precision: Ottawa city-level</p>
      <p class="meta-line">Marker spacing is a visual index, not a claimed street address or geographic coordinate. Exact locations will appear only when Source-backed location Evidence is available. Marker size reports the number of Evidence records on file for that Company.</p>
      <svg viewBox="0 0 660 470" role="img" aria-labelledby="map-title map-description" style="display:block;width:100%;min-height:390px;background:var(--paper-light);border:1px solid var(--rule);border-radius:2px;margin-top:16px">
        <title id="map-title">Ottawa city-level Company map</title>
        <desc id="map-description">A non-geocoded visual index of ${sorted.length} Companies known to operate in Ottawa. Marker size reports observed Evidence volume.</desc>
        <path d="M80 245 Q150 90 330 70 Q520 80 585 230 Q535 390 330 410 Q125 390 80 245Z" fill="none" stroke="#B99F7D" stroke-width="1.5"/>
        <circle cx="330" cy="235" r="42" fill="#E5D3B0" stroke="#C45124" stroke-width="2"/>
        <text x="330" y="230" text-anchor="middle" fill="#241A14" font-size="17" font-weight="700">OTTAWA</text>
        <text x="330" y="251" text-anchor="middle" fill="#6B5A48" font-size="11">city-level placement</text>
        <g fill="#241A14" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="10">${pins}</g>
      </svg>
    </section>
    <section style="padding-top:32px"><p class="eyebrow">${sorted.length} mapped Companies · shared read projection</p><div class="directory-list">${rows || '<div class="empty">No Companies in this view.</div>'}</div></section>
  </main>`, "map");
}
