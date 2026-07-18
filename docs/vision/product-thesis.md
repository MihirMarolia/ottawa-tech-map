# Product Thesis

## One-liner

ottawa-tech-map is a **knowledge engine for industry ecosystems** — a search engine that renders a map, not a map with search bolted on.

## Problem

Industry ecosystems (companies, people, signals, relationships) are scattered across news, social posts, filings, and word of mouth. Today's maps are static snapshots: a curated list of pins, manually maintained, stale within a week. They are not queryable, not searchable, and not trustworthy.

## Thesis

The map is a **rendering surface** for an underlying knowledge graph that is continuously collected, validated, enriched, and applied through an agent-driven pipeline with human approval gates. The product's value lives in the **search readiness** of the data — every signal must be queryable by keyword, filter, or geo query — and in the **auditability** of every change (proposal → audit → approval → apply).

## Why now

- Agent pipelines can now propose field updates from noisy sources at a usable cost.
- Postgres + full-text search + PostGIS make a single-query "find me X near Y matching Z" tractable without a separate search cluster.
- Trust in AI-generated content demands an audit trail; the proposal → approval → apply loop is the differentiator over a pure LLM-mash-up.

## What we are not

See `docs/out-of-scope/` for explicitly rejected ideas. In short: we are not a generic LLM wrapper, not a no-approval auto-mutator, and not a map-first product.
