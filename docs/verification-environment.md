# Canonical Supabase verification environment

The user-controlled canonical development and verification environment for Ottawa Tech Map is **`ottawa-tech-map-verification`**. It is distinct from all previously used projects and is the only Supabase project authorized for future migration, verification, and integration work.

| Field | Value |
|---|---|
| Project reference | `hwgneqvtlbqecfroebqz` |
| Organization | `ottawa-tech-map-verification` (`wlaioyuaygykgbtttehs`) |
| Region | `us-west-2` |
| Status at verification | `ACTIVE_HEALTHY` |
| Intended use | Canonical development, controlled verification, and demo/staging data only |
| Production status | Not production |

The canonical project was reset with the supported linked-project reset path and rebuilt solely from the repository migration chain, with no seed load and no approved 08B corpus-company import. GitHub remains the canonical source for migrations and application code.

Credentials must remain external to the repository. Public reads must use an anonymous/publishable client, while controlled setup and ingestion operations must use a separate server-side service-role or secret-key client. Neither key type belongs in frontend code, tracked environment files, documentation, fixtures, logs, or commits.

Historical references to earlier Supabase environments remain only in dated verification records. They are not authorized targets for future operations.
