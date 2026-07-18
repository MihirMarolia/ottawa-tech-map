# ADR-0001: Postgres as the single source of truth

Date: 2026-07-18
Status: Accepted

## Context

The product is a search engine that renders a map. Data must be queryable by keyword, filter, and geo, and every change must be auditable. We considered:

- A separate search cluster (Elasticsearch / OpenSearch) alongside Postgres.
- A graph database (Neo4j) for entity relationships.
- Plain Postgres with full-text search (`tsvector`) and PostGIS for geo.

## Decision

Use Postgres as the single source of truth, with `tsvector` for full-text search and PostGIS for geo. No separate search cluster, no separate graph database.

## Rationale

- One source of truth means one audit trail. A separate search cluster would need its own sync and its own provenance story.
- `tsvector` + GIN indexes handle the query patterns we expect at this scale.
- PostGIS handles geo natively.
- Entity relationships are typed edges in a join table; we don't need a dedicated graph DB until we hit a query pattern Postgres can't serve.

## Consequences

- We must design every schema with search readiness in mind from day one (engineering constitution, principle 6).
- We must keep the service layer thin and push business rules into constraints, triggers, and views (principle 4).
- If we outgrow Postgres FTS, we revisit this decision with a new ADR.

## Revisit trigger

A user-facing query that cannot be served by Postgres FTS + PostGIS without a full table scan at the expected data volume.
