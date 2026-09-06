# Data Sourcing Policy

What we are allowed to collect, from where, and how a lead becomes a published
fact. This complements `docs/domain/privacy-boundary.md` (which governs
*personal* data) by governing *company* data sourcing and licensing.

## Purpose

ottawa-tech-map is a non-profit public directory. We publish **facts about
companies that exist** — not curated commentary, rankings, or compiled lists
belonging to someone else. Non-profit intent does not change what is legal to
collect; it changes what we're incentivized to collect responsibly. This
policy exists so that distinction is never left to individual judgment.

## Two separate restrictions, not one

**Copyright / compilation rights** protect a source's *original expression* —
their category selections, rankings, methodology, write-ups, formatting. They
do **not** protect the underlying facts (that a company exists, its name, its
sector, its city). Non-profit use does not exempt us from this: reproducing
someone's compiled ranking or descriptive text is a copyright question
regardless of whether money changes hands.

**Terms of Service** are a contract restriction on *how* we may interact with
a site (e.g. "no automated scraping"), independent of copyright. They bind us
the moment we use the site, regardless of profit motive. A human manually
looking something up and typing a URL into our own record does not violate a
scraping prohibition; an automated collector crawling and bulk-copying the
site does.

Every source below is evaluated against both.

## The rule

> **We publish facts we have independently verified against a primary source.
> We do not republish another party's compiled rankings, categories,
> descriptions, or text — automated or manual — even for free, even
> attributed.**

A source that is copyrighted or ToS-restricted can still be used as a
**Discovery Lead**: a human-reviewed hint that a company might exist and is
worth verifying. A Discovery Lead is never itself published and never becomes
a Signal or Evidence until an operator confirms the company against a primary
source (the company's own site, a government registry, a procurement record,
a job posting, direct correspondence). See `docs/domain/ubiquitous-language.md`
for the Signal/Evidence/Source definitions this maps onto.

```text
Copyrighted or ToS-restricted list
        │  (human reads, names a candidate company)
        ▼
   Discovery Lead (never published, never a Signal)
        │  (operator independently verifies)
        ▼
   Primary Source (company site, registry, procurement, job posting)
        │
        ▼
   Signal → Evidence → published Company fact
```

## Source-by-source disposition

| Source | Category | Automated collection | Manual lead use | Publish directly? |
|---|---|---|---|---|
| Company's own website | Primary, public | Yes | Yes | Yes (it's the company speaking about itself) |
| CanadaBuys / government procurement | Primary, public record | Yes | Yes | Yes |
| Government grant/funding announcements | Primary, public record | Yes | Yes | Yes |
| Corporate registries (ON/QC) | Primary, public record | Yes | Yes | Yes |
| Invest Ottawa directory | Public directory, low compilation-originality | Yes, with attribution as Source metadata | Yes | Facts yes; do not copy their descriptive copy verbatim |
| Kanata North member list | Public directory | Yes | Yes | Facts yes, same caveat |
| University/accelerator portfolio pages | Public, first-party | Yes | Yes | Yes |
| OBJ Book of Lists (print, owned copy) | Licensed compiled work | **No** | Yes — read to find candidate names | **No** — never transcribe their lists, rankings, or text |
| BetaKit articles | Copyrighted journalism | No bulk scraping | Yes — read for names/events | No — cite as a Source pointing to their article; do not reproduce their text |
| Crunchbase | ToS-restricted + compiled data | **No** | Yes, one-off manual lookup only | No — verify the fact elsewhere before publishing |
| LinkedIn | ToS-restricted | **No** | Yes, one-off manual lookup only | No — company/role facts only if also public elsewhere |
| Dealroom / StartupBlink / Built In | ToS-restricted compiled databases | **No** | Yes — discovery only | No |
| CVCA Intelligence | Licensed data | No | Only if we have a license | No, unless licensed |

"Automated collection: Yes" still goes through the Privacy Gateway and
Signal Ingestion pipeline like any other Source — this table governs
*licensing/ToS eligibility*, not the technical trust boundary.

## Geography rule

A company qualifies for the directory only if it has a permanent HQ or office
physically located in Ottawa or Gatineau, confirmed by at least one primary
source (registry address, company site address, or a procurement/grant record
naming the location). "Serves the Ottawa market," "mentioned alongside Ottawa
companies," or a single remote employee do not qualify. This rule exists
because source directories (Crunchbase, StartupBlink, Built In) each define
"Ottawa company" differently, and reconciling their counts is not possible
without one fixed definition.

## What this does not authorize

This is a sourcing/licensing policy, not an implementation authorization. Any
new automated collector still requires its own ticket against
`SignalIngestionService`, its own fixture-first tests, and Definition of Done
per `AGENTS.md` / `CLAUDE.md`.
