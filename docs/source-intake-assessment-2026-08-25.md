# Proofward Source Intake Assessment — Working Notes

## Scope and guardrail

This assessment evaluates potential **source inputs**, not canonical facts or public profiles. No external data may be added directly to durable Company, Offering, signal, proposal, or public-projection records. Each candidate must retain URL, publisher, retrieval time, claim scope, source type, source-observation date (where defensible), and a human review disposition.

## Preliminary findings

| Source | Observed public function | Reuse and evidence posture | Recommended role |
|---|---|---|---|
| Build Canada | Public site with memos, builder profiles, projects, and dated editorial/community content. The homepage identifies itself as a platform promoting builders’ ideas and stories and displays `© Build Canada 2026`. [1] | No public API, dataset licence, or machine-reuse permission was identified in the homepage review. Treat its material as editorial/contextual—not primary proof of a Company’s product, service, current identity, or location. | **Manual discovery only**: a reviewer may open a specific item, capture a permitted link/title/date, and seek the underlying first-party or official record. Do not crawl, republish text, or bulk ingest without written permission. |
| BetaKit | Canadian technology journalism that describes itself as reporting on startups, technology innovation, companies, trends, and ideas. [2] | Its Terms state that content and compilations are protected; commercial use, downloading/copying for another business, and data-mining/robotic extraction are prohibited without express written consent. [3] | **Link-only discovery and corroboration only** unless BetaKit grants a written licence. Never bulk ingest, scrape, store article text, or treat reporting as the sole proof of a product/service claim. |
| Government of Canada Open Government Portal | Public catalogue and read-only CKAN API for federal, provincial, and municipal datasets. [4] | The Open Government Licence – Canada permits lawful commercial and non-commercial reuse, subject to attribution, but excludes personal information, third-party rights, official marks, and implied government endorsement. [5] | **Structured official-record source**: use individual dataset licences and data dictionaries; preserve publisher, dataset, record URL, retrieval time, attribution, and the official record date. |
| Federal proactive contract disclosure | Treasury Board dataset consolidating proactive contract reports submitted by federal reporting entities. [6] | The publisher states the reports are unaudited and does not warrant accuracy or completeness. | **Government-contract signal candidate**: retain as a reported public record; never infer product capability, revenue, current relationship, or company identity solely from a matching supplier name. |
| CanadaBuys award notices | Public Services and Procurement Canada dataset of federal award notices, with publication date, status, categories, amendments, and a documented schema. [7] | The 2022-onward record is refreshed each morning and award notices may be active, cancelled, or expired. | **Preferred government pilot source** for official award-notice observations: ingest only active, date-qualified award records, preserve status and amendment context, and route entity resolution through Review Queue. |

## Working rule

For both editorial sources, an article may trigger a **review candidate** such as “verify reported launch” or “find official announcement.” The durable evidence used for a factual offering, relationship, or public Company profile must come from a primary company source or official government record, unless a specific written licence and a source-type policy explicitly authorize a narrower exception.

Government data is appropriate for a separately labelled **official-record signal**. It is not an offering catalogue, a business-quality score, or a direct Company-creation feed. Supplier-name matching, address matching, missing records, expired awards, and unaudited disclosure values must all remain reviewable rather than automated canonical facts.

## Sources

[1] [Build Canada homepage](https://www.buildcanada.com/)

[2] [BetaKit — About Us](https://betakit.com/about-us/)

[3] [BetaKit — Terms of Use](https://betakit.com/terms-of-use/)

[4] [Open Government Portal API](https://open.canada.ca/data/en/dataset/2d90548d-50ef-4802-91f8-c59c5cf68251)

[5] [Open Government Licence – Canada](https://open.canada.ca/en/open-government-licence-canada)

[6] [Proactive Publication — Contracts](https://open.canada.ca/data/en/dataset/d8f85d91-7dec-4fd1-8055-483b77225d8b)

[7] [CanadaBuys award notices](https://open.canada.ca/data/en/dataset/a1acb126-9ce8-40a9-b889-5da2b1dd20cb)
