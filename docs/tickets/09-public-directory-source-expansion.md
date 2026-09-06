# Ticket 09 — Public Directory Source Expansion

**Status:** Contract proposed; **implementation is not authorized by this document**.

**Objective:** Move past fictional fixtures toward the deferred 30-Company /
100-real-Signal research target from
`docs/milestones/0003-ottawa-public-data-mvp.md`, using only sources cleared
by `docs/domain/data-sourcing-policy.md`.

## 1. Scope and Non-Goals

| In scope | Explicitly out of scope |
|---|---|
| First 2–3 sources: Invest Ottawa directory, CanadaBuys procurement, manual OBJ-led verification | Crunchbase/LinkedIn/Dealroom/StartupBlink automated collection (ToS-restricted; see sourcing policy) |
| Reuse of the existing `SignalIngestionService` / `EntityResolver` / `PrivacyGateway` seams | A new "DiscoveryLead" persistence layer or schema |
| A manual, human-in-the-loop verification workflow for OBJ-sourced leads | Automated ingestion of any copyrighted or ToS-restricted source |
| One fixed geography rule (HQ/office in Ottawa or Gatineau, primary-source confirmed) | Redefining entity-resolution confidence thresholds (`docs/domain/entity-resolution.md` already governs this) |

## 2. Why these three sources first

- **Invest Ottawa directory** and **CanadaBuys** are both freely collectible per the sourcing policy table and are structurally close to what Ticket 02 already proved out (a Source → sanitize → resolve → Signal path).
- **OBJ (print, owned copy)** cannot be automated or transcribed, but is the highest-density *lead* source for companies a directory-only scrape would miss. It only ever produces a Discovery Lead, never a published fact — see below.

This intentionally excludes every ToS-restricted database (Crunchbase, LinkedIn, Dealroom, StartupBlink, Built In) from this ticket. They remain available as manual, one-off lookups an operator performs while verifying a lead, never as a collector.

## 3. Discovery Lead workflow (OBJ and similar copyrighted sources)

A Discovery Lead is not a Signal and is not persisted through the Signal
Ingestion pipeline. It is operator working state:

1. Operator reads a candidate company name from the print Book of Lists.
2. Operator finds the company's own website and/or a registry/procurement
   record independently.
3. Operator confirms the geography rule from that primary source.
4. Only then does the company enter the normal pipeline: a real Source
   record (the company's site, the registry entry, or the procurement
   notice — never "OBJ Book of Lists 2026") is ingested through
   `SignalIngestionService`, resolved by the existing `EntityResolver`, and
   persisted as a Company with real Evidence.

No OBJ text, category, or ranking is stored anywhere in the system at any
step. If a company cannot be independently confirmed, it is dropped, not
published as "per OBJ."

## 4. Acceptance criteria (for the eventual implementation ticket)

- [ ] Invest Ottawa and CanadaBuys each have a documented, reviewed field
      mapping into `IngestCorporateSource` / the existing Source shape.
- [ ] No OBJ-derived text, ranking, or category ever appears in a Source,
      Signal, fixture, log, or snapshot — only independently-verified primary
      Source URLs do.
- [ ] Every persisted Company satisfies the geography rule with a cited
      primary-source confirmation.
- [ ] No automated request is made to Crunchbase, LinkedIn, Dealroom,
      StartupBlink, or Built In from any collector code.
- [ ] Definition of Done in `AGENTS.md` / `CLAUDE.md` is satisfied in full.

## 5. Open questions for the next ticket author

- Does Invest Ottawa's directory page structure support a stable per-company
  URL to use as canonical Source metadata, or does it require a manual list
  first?
- What is CanadaBuys's actual export/API shape, and does it require
  pagination/rate-limit handling that changes the collector's shape?
