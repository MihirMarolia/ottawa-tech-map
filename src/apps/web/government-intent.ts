import type { DirectoryCompany } from "./directory.js";
import { renderPageLayout, renderStatTile } from "./directory.js";

export type GovernmentIntentCategory =
  | "Contract plus current hiring"
  | "Confirmed contract evidence"
  | "Security-cleared hiring without confirmed contract"
  | "Current hiring without confirmed contract"
  | "No recent evidence";

export type GovernmentIntentRow = {
  company: DirectoryCompany;
  category: GovernmentIntentCategory;
  contractCount: number;
  currentHiringCount: number;
  securityClearanceHiring: boolean;
  awardingOrganizations: ReadonlyArray<string>;
  latestEvidenceDate: string;
  containsFixtureEvidence: boolean;
};

const DAY_MS = 86_400_000;
const withinDays = (observedAt: string, referenceDate: string, days: number) => {
  const age = (Date.parse(referenceDate + "T00:00:00Z") - Date.parse(observedAt + "T00:00:00Z")) / DAY_MS;
  return age >= 0 && age <= days;
};

export function buildGovernmentIntentRows(
  companies: ReadonlyArray<DirectoryCompany>,
  referenceDate: string,
): GovernmentIntentRow[] {
  const priority: Record<GovernmentIntentCategory, number> = {
    "Contract plus current hiring": 0,
    "Confirmed contract evidence": 1,
    "Security-cleared hiring without confirmed contract": 2,
    "Current hiring without confirmed contract": 3,
    "No recent evidence": 4,
  };
  return companies.map((company) => {
    const contracts = company.evidence.filter(
      (item) => item.kind === "government_contract" && withinDays(item.observedAt, referenceDate, 730),
    );
    const currentJobs = company.evidence.filter(
      (item) => item.kind === "job_posting" && withinDays(item.observedAt, referenceDate, 90),
    );
    const securityClearanceHiring = currentJobs.some(
      (item) => item.kind === "job_posting" && item.securityClearanceRequired,
    );
    const category: GovernmentIntentCategory = contracts.length > 0 && currentJobs.length > 0
      ? "Contract plus current hiring"
      : contracts.length > 0
        ? "Confirmed contract evidence"
        : securityClearanceHiring
          ? "Security-cleared hiring without confirmed contract"
          : currentJobs.length > 0
            ? "Current hiring without confirmed contract"
            : "No recent evidence";
    return {
      company,
      category,
      contractCount: contracts.length,
      currentHiringCount: currentJobs.length,
      securityClearanceHiring,
      awardingOrganizations: contracts.map((item) => item.kind === "government_contract" ? item.awardingOrganization : ""),
      latestEvidenceDate: company.evidence.map((item) => item.observedAt).sort().at(-1) ?? company.lastVerifiedDate,
      containsFixtureEvidence: [...contracts, ...currentJobs].some((item) => item.fixture),
    };
  }).sort((left, right) =>
    priority[left.category] - priority[right.category] ||
    right.latestEvidenceDate.localeCompare(left.latestEvidenceDate) ||
    left.company.canonicalName.localeCompare(right.company.canonicalName)
  );
}

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

export function renderGovernmentIntentMonitor(
  companies: ReadonlyArray<DirectoryCompany>,
  referenceDate = "2026-08-05",
): string {
  const rows = buildGovernmentIntentRows(companies, referenceDate);
  const active = rows.filter((row) => row.category !== "No recent evidence");
  const listRows = rows.map((row, index) => {
    const indexLabel = String(index + 1).padStart(2, "0");
    const isInactive = row.category === "No recent evidence";
    const meta = [
      `${row.contractCount} contract Signals`,
      `${row.currentHiringCount} hiring Signals`,
      row.securityClearanceHiring ? "Security clearance explicitly required" : "",
      row.awardingOrganizations.length ? `Awarding organization: ${escapeHtml(row.awardingOrganizations.join(", "))}` : "",
    ].filter(Boolean).join(" · ");
    return `<a class="row" href="/companies/${encodeURIComponent(row.company.slug)}">
      <span class="row-index">${indexLabel}</span>
      <span class="row-body">
        <span class="row-name">${escapeHtml(row.company.canonicalName)}</span>
        <span class="row-desc">${escapeHtml(row.category)}${row.containsFixtureEvidence ? " · Contains fictional fixture" : ""}</span>
        <span class="row-meta">${meta}</span>
      </span>
      <span class="row-count"><span class="value${isInactive ? " zero" : ""}">${escapeHtml(row.latestEvidenceDate)}</span><span class="label">Latest Evidence</span></span>
    </a>`;
  }).join("");
  return renderPageLayout("Government Intent Monitor", `<main><section class="hero"><p class="eyebrow">Ottawa Government Intent Monitor</p><h1>Federal-market activity, with the Evidence left visible.</h1><p class="lede">Transparent categories combine contract Evidence from the last 24 months with hiring Evidence from the last 90 days. They are not predictions or opaque scores.</p></section>
  <section class="statgrid">${renderStatTile(active.length, "Companies with current indicators")}<div class="stat-tile"><span class="value">${escapeHtml(referenceDate)}</span><span class="label">Reference date</span></div></section>
  <section style="padding-top:32px"><p class="eyebrow">Evidence categories</p><div class="directory-list">${listRows}</div></section></main>`, "government-intent");
}
