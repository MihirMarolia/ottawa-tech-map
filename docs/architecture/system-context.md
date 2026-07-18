# System Context

High-level shape of ottawa-tech-map.

```
        ┌─────────────┐         ┌──────────────┐
        │  External   │         │   Human      │
        │  sources    │         │  approver    │
        └──────┬──────┘         └──────┬───────┘
               │                       │
               v                       v
        ┌──────────────────────────────────────┐
        │           Agent pipeline              │
        │  collectors → validators → enrichers  │
        │      → agent actions → approval       │
        │            → apply                    │
        └─────────────────┬────────────────────┘
                          │
                          v
                ┌──────────────────┐
                │   Postgres        │
                │  (source of       │
                │   truth + FTS     │
                │   + PostGIS)      │
                └────────┬─────────┘
                         │
                         v
                ┌──────────────────┐
                │   Web app         │
                │   (search + map)  │
                └──────────────────┘
```

## Boundaries

- **External sources** are read-only to us; we never write back.
- **The agent pipeline** proposes; it never directly mutates production data. Every agent-driven change requires an audit log entry before application.
- **Postgres** is the source of truth. Business rules live in constraints, triggers, and views where possible; the service layer coordinates reads/writes.
- **The web app** is a thin read surface over Postgres. It renders the map and serves search; it holds no business policy.

## What lives where

- `agent/` — collectors, validators, enrichers, the proposal/audit/approval/apply loop.
- `web/` — search and map UI; reads from Postgres.
- `supabase/migrations/` — schema, constraints, triggers, views, RLS.

See `ingestion-pipeline.md` and `frontend-boundary.md` for the two internal seams.
