# Ottawa public-data MVP

## Scope

This milestone completes Tickets 07–14 as a functional local MVP using public
Company metadata and deterministic fictional Signal fixtures.

## Demonstrated workflow

- 10 reviewed Ottawa Companies with 28 verified official public Source records
- controlled CSV inspection, validation, preview, exact-domain resolution,
  deterministic replay, and Review Queue outcomes
- PostgreSQL-enforced Source and Signal identity plus executable reviewed
  decisions
- government-contract and job-posting Signal contracts
- Company search, Evidence filters, profiles, timelines, and transparent current
  indicators
- Ottawa Government Intent Monitor with three explicitly fictional,
  multi-Signal test cases and one official public hiring Signal
- sanitized job-posting extraction boundary with a passing 20-case deterministic
  precision evaluation
- Ottawa city-level exploration map using the same Company read projection as
  search and profiles

## Trust boundaries

The public manifest stores URL metadata only; it does not copy page bodies.
Fictional Companies and Signals use reserved example domains and are labelled
on every presentation surface. Automated ingestion does not create canonical
Companies. Raw Source text does not enter logs, persistence, snapshots, or
rendered output.

## Deferred data expansion

The 30-Company and 100-real-Signal research targets remain a post-MVP data
milestone. They require additional public research or licensed market-research
exports and are not simulated as real evidence. Live Gemini extraction, remote
Supabase deployment, scheduled collectors, additional Signal types, and
street-level geocoding are also deferred.

## Verification

The milestone requires a clean `npm run check`, fresh local
`npm run db:verify`, and HTTP 200 responses for the directory, Company profile,
Government Intent Monitor, and map routes.

