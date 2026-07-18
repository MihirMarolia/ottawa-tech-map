# Frontend Boundary

What the web app is and is not allowed to do.

## Allowed

- Read from Postgres views and materialized views.
- Run full-text search and geo queries against indexed columns.
- Render the map and search results.
- Link a rendered pin back to its provenance (Entity → proposal → signals → source URL).

## Not allowed

- Direct writes to Entity, signal, proposal, or audit tables.
- Holding business policy (e.g. scoring thresholds, merge rules). Those live in the database or the agent pipeline.
- Calling external sources from the client. All ingestion goes through the agent pipeline.
- Mutating data based on user input. User input (corrections, redaction requests) goes into a queue the agent pipeline consumes.

## Search readiness

Per the engineering constitution, every schema design must consider full-text search from day one. The frontend relies on:

- Indexed text fields on every searchable Entity.
- A documented query pattern per Entity type (keyword, filter, geo).
- No full-table scans for any user-facing query.

If a new Entity can't be searched without a full table scan, the schema is not done — fix it before shipping the feature.

## Auth

The web app uses Supabase Auth when sign-in is required. Anonymous browsing (search + map) is allowed by default; RLS policies scope writes to authenticated maintainers.
