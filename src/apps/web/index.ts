type CompanyProfileView = {
  company: {
    canonicalName: string;
    canonicalDomain: string;
  };
  evidence: ReadonlyArray<{
    contractType: "professional_services";
    observedAt: string;
    confidence: number;
    source: { name: string; url: string };
  }>;
} | null;

type ReviewQueueView = ReadonlyArray<{
  reason: "conflicting_evidence" | "low_confidence";
  source: { name: string; url: string };
  candidates: ReadonlyArray<{ observedName: string; observedDomain: string; confidence: number }>;
}>;

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function presentContractType(contractType: "professional_services"): string {
  return contractType === "professional_services" ? "Professional services" : contractType;
}

function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

function documentStyles(): string {
  return `<style>
    :root{color-scheme:light;--ink:#17212b;--muted:#667482;--line:#dfe6eb;--surface:#fff;--wash:#f5f8fa;--navy:#12344d;--blue:#1e6d9f;--green:#2b765c;--amber:#a86b16}*{box-sizing:border-box}body{margin:0;background:var(--wash);color:var(--ink);font:15px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:var(--blue);text-underline-offset:3px}.site-header{background:var(--navy);color:#fff;border-bottom:4px solid #2f88a1}.header-inner,.page{width:min(1120px,calc(100% - 40px));margin:0 auto}.header-inner{min-height:72px;display:flex;align-items:center;justify-content:space-between;gap:24px}.brand{display:flex;align-items:center;gap:12px;color:#fff;text-decoration:none}.brand-mark{width:30px;height:30px;border:2px solid #9ad5d8;border-radius:8px;position:relative}.brand-mark:after{content:"";position:absolute;width:8px;height:8px;background:#f3bd58;border-radius:50%;top:7px;left:9px;box-shadow:7px 9px 0 #68b7ad}.brand-title{font-weight:700}.brand-subtitle{display:block;color:#b5c8d4;font-size:11px;letter-spacing:.08em;text-transform:uppercase}.primary-nav{display:flex;gap:20px;font-size:13px}.primary-nav a{color:#d8e7ed;text-decoration:none}.primary-nav a[aria-current=page]{color:#fff;font-weight:700}.page{padding:48px 0 72px}.eyebrow{color:var(--blue);font-size:12px;font-weight:750;letter-spacing:.12em;text-transform:uppercase;margin:0 0 10px}h1,h2,h3{line-height:1.2;margin:0;color:var(--navy)}h1{font-size:clamp(30px,5vw,48px);letter-spacing:-.035em}h2{font-size:20px}h3{font-size:16px}.lede{max-width:680px;color:var(--muted);font-size:17px;margin:14px 0 28px}.search-panel{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:18px;box-shadow:0 10px 28px rgba(18,52,77,.06)}.search-row{display:flex;gap:10px}.search-row input{flex:1;min-width:0;border:1px solid #b8c8d2;border-radius:8px;padding:12px 14px;font:inherit;color:var(--ink)}.search-row input:focus{outline:3px solid rgba(47,136,161,.2);border-color:var(--blue)}.button{border:0;border-radius:8px;background:var(--blue);color:#fff;font:700 14px inherit;padding:0 20px;cursor:pointer}.search-hint{color:var(--muted);font-size:12px;margin:9px 0 0}.section{margin-top:40px}.section-heading{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:14px}.section-heading p{color:var(--muted);margin:0;font-size:13px}.profile-header{display:flex;justify-content:space-between;align-items:flex-start;gap:28px;padding-bottom:28px;border-bottom:1px solid var(--line)}.domain{color:var(--muted);margin:10px 0 0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px}.trust-note{max-width:270px;color:var(--muted);border-left:3px solid #9ad5d8;padding-left:14px;font-size:13px}.evidence-list{display:grid;gap:14px}.evidence{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:20px}.evidence-top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.signal-label{color:var(--green);font-size:12px;font-weight:750;letter-spacing:.1em;text-transform:uppercase;margin:0 0 7px}.confidence{color:var(--green);background:#edf7f1;border-radius:999px;font-size:12px;font-weight:750;padding:5px 10px;white-space:nowrap}.evidence-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:18px;padding-top:16px;border-top:1px solid var(--line)}.evidence-grid dt{color:var(--muted);font-size:12px;margin-bottom:3px}.evidence-grid dd{margin:0;font-weight:650}.provenance{background:#f7fafb;border-radius:8px;color:var(--muted);font-size:12px;margin-top:18px;padding:10px 12px}.provenance strong{color:var(--ink)}.empty-state{background:var(--surface);border:1px dashed #b7c8d1;border-radius:12px;padding:28px;text-align:center}.empty-state p{color:var(--muted);max-width:560px;margin:8px auto 0}.not-found{max-width:700px;margin:42px auto;text-align:center}.review-item{background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--amber);border-radius:10px;padding:18px 20px;margin-top:12px}.review-item p{color:var(--muted);margin:7px 0 12px}.candidate-list{margin:0;padding-left:20px}.candidate-list li{margin:5px 0}@media(max-width:680px){.header-inner,.page{width:min(100% - 28px,1120px)}.header-inner{min-height:64px}.primary-nav{gap:10px}.primary-nav a:last-child{display:none}.page{padding-top:32px}.profile-header,.evidence-top{display:block}.trust-note{margin-top:22px}.confidence{display:inline-block;margin-top:14px}.evidence-grid{grid-template-columns:1fr;gap:12px}.search-row{display:block}.search-row input{width:100%}.button{width:100%;height:44px;margin-top:9px}}
  </style>`;
}

function siteHeader(currentPage: "discover" | "profile" | "review"): string {
  return `<header class="site-header"><div class="header-inner"><a class="brand" href="/" aria-label="Ottawa Tech Map home"><span class="brand-mark" aria-hidden="true"></span><span><span class="brand-title">Ottawa Tech Map</span><span class="brand-subtitle">Evidence-led ecosystem intelligence</span></span></a><nav class="primary-nav" aria-label="Primary navigation"><a href="/" ${currentPage === "discover" ? 'aria-current="page"' : ""}>Discover</a><a href="/map">Map</a><a href="/review" ${currentPage === "review" ? 'aria-current="page"' : ""}>Review queue</a></nav></div></header>`;
}

function pageDocument(title: string, currentPage: "discover" | "profile" | "review", content: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title>${documentStyles()}</head><body>${siteHeader(currentPage)}<main class="page">${content}</main></body></html>`;
}

export function renderCompanyProfile(profile: CompanyProfileView): string {
  if (profile === null) {
    return pageDocument("Company not found — Ottawa Tech Map", "discover", `<section class="not-found" aria-labelledby="not-found-heading"><p class="eyebrow">Company profile</p><h1 id="not-found-heading">Company not found</h1><p class="lede">This company is not available in the current intelligence set. Try a broader search, or return to discovery to explore verified records.</p><a href="/">Back to discovery</a></section>`);
  }
  const evidence = profile.evidence.length === 0
    ? `<div class="empty-state"><h3>No published evidence is available yet</h3><p>This profile is present, but the current dataset does not contain a signal that can be shown here. Nothing has been inferred or filled in.</p></div>`
    : `<div class="evidence-list">${profile.evidence.map((item) => `<article class="evidence"><div class="evidence-top"><div><p class="signal-label">Observed signal</p><h3>Government contract awarded</h3></div><span class="confidence" title="Validator-assigned confidence for this signal">${formatConfidence(item.confidence)} validation confidence</span></div><dl class="evidence-grid"><div><dt>Contract type</dt><dd>${presentContractType(item.contractType)}</dd></div><div><dt>Observed</dt><dd><time datetime="${escapeHtml(item.observedAt)}">${escapeHtml(item.observedAt)}</time></dd></div><div><dt>Source</dt><dd><a href="${escapeHtml(item.source.url)}" rel="noopener noreferrer">${escapeHtml(item.source.name)}</a></dd></div></dl><p class="provenance"><strong>Provenance:</strong> signal → source record → <a href="${escapeHtml(item.source.url)}" rel="noopener noreferrer">open original source</a></p></article>`).join("")}</div>`;
  return pageDocument(`${profile.company.canonicalName} — Company profile`, "profile", `<section aria-labelledby="profile-heading"><div class="profile-header"><div><p class="eyebrow">Company profile</p><h1 id="profile-heading">${escapeHtml(profile.company.canonicalName)}</h1><p class="domain">${escapeHtml(profile.company.canonicalDomain)}</p></div><p class="trust-note">This profile shows only fields supported by the current evidence set. Confidence describes the signal, not the company.</p></div></section><section class="section" aria-labelledby="evidence-heading"><div class="section-heading"><h2 id="evidence-heading">Evidence</h2><p>${profile.evidence.length} recorded signal${profile.evidence.length === 1 ? "" : "s"}</p></div>${evidence}</section>`);
}

export function renderDiscovery(): string {
  return pageDocument("Discover companies — Ottawa Tech Map", "discover", `<section aria-labelledby="discover-heading"><p class="eyebrow">Company intelligence</p><h1 id="discover-heading">Find the companies shaping Ottawa’s tech ecosystem.</h1><p class="lede">Search company records first. Open a profile to understand what is known, how strong the signal is, and where it came from.</p><form class="search-panel" action="/search" method="get"><label class="eyebrow" for="company-search">Search companies</label><div class="search-row"><input id="company-search" name="q" type="search" placeholder="Company name or domain" autocomplete="off"><button class="button" type="submit">Search</button></div><p class="search-hint">Search uses the indexed company records. Results are not inferred from the map.</p></form></section><section class="section" aria-labelledby="starting-heading"><div class="section-heading"><h2 id="starting-heading">Start with a question</h2><p>Explore the evidence trail</p></div><div class="empty-state"><h3>Search results will appear here</h3><p>No companies are being suggested without a query. This keeps discovery honest and makes the evidence behind each result explicit.</p></div></section>`);
}

export function renderReviewQueue(items: ReviewQueueView): string {
  const content = items.length === 0
    ? `<div class="empty-state"><h2>Nothing needs review</h2><p>There are no unresolved entity matches in the current queue. New items will appear here only when the pipeline flags ambiguity or low confidence.</p></div>`
    : items.map((item) => { const reason = item.reason === "conflicting_evidence" ? "Conflicting evidence" : "Low confidence"; const candidates = item.candidates.length === 0 ? "<p>No candidate matches were retained for display.</p>" : `<ul class="candidate-list">${item.candidates.map((candidate) => `<li><strong>${escapeHtml(candidate.observedName)}</strong> <span class="domain">${escapeHtml(candidate.observedDomain)}</span> — ${formatConfidence(candidate.confidence)}</li>`).join("")}</ul>`; return `<article class="review-item"><h2>${reason}</h2><p>Source record: <a href="${escapeHtml(item.source.url)}" rel="noopener noreferrer">${escapeHtml(item.source.name)}</a></p><h3>Candidate matches</h3>${candidates}</article>`; }).join("");
  return pageDocument("Review queue — Ottawa Tech Map", "review", `<section aria-labelledby="review-heading"><p class="eyebrow">Data quality</p><h1 id="review-heading">Review queue</h1><p class="lede">Ambiguous records stay visible for human review rather than being silently merged. This queue is part of the evidence chain.</p></section><section class="section" aria-label="Review items">${content}</section>`);
}

export type { CompanyProfileView, ReviewQueueView };
export { escapeHtml };
