# Security Review — Canonical Baseline

## Scope and baseline

This review examined the canonical `main` baseline at commit `9ba037e` and the current tracked repository state. It covered all reachable Git objects, current tracked files, GitHub workflow configuration, public and privileged Supabase boundaries, and the production dependency manifest. The only authorized Supabase project remains `hwgneqvtlbqecfroebqz`.

## Findings and remediation

| Area | Finding | Disposition |
|---|---|---|
| Tracked files and reachable Git history | The non-disclosing scanner examined 386 reachable blobs and 285 tracked files. It found no token, private-key, API-key, password, credential-URL, or JWT-shaped secret. | **PASS** |
| Scanner flag | `supabase/config.toml` matched a generic assignment heuristic because it references `env(OPENAI_API_KEY)`. The file contains an environment-variable reference, not a secret value. | **False positive; no code change required** |
| Environment-file protection | `.env.production` and `.env.staging` were not covered by the previous ignore rules. | **Remediated** by ignoring `.env.*` while retaining the safe `.env.example` template exception. |
| Supabase local metadata | `supabase/.temp` and `.branches` are ignored. | **PASS** |
| GitHub Actions workflow | The workflow uses read-only `contents` permission, runs on a pinned Supabase CLI version, uses only runner-local test credentials, avoids repository secrets, and stops the local stack with `if: always()`. | **PASS** |
| Demo server | The demo server binds only to `127.0.0.1`, validates the port, sends a restrictive content-security policy, and sets `nosniff`. | **PASS** |
| Public database boundary | Direct anonymous reads of companies, offerings, proposals, and audit events are denied. Approved company, offering, and evidence projections remain readable and exclude internal identifiers and unrestricted payloads. Privileged apply and persistence RPCs are denied to anonymous callers. | **PASS** |
| Reviewer actions | Authenticated SECURITY DEFINER review and offering-decision RPCs enforce reviewer membership internally before taking action. | **PASS** |

## Supabase advisor interpretation

The managed Supabase security advisor reports informational notices for RLS-enabled internal tables with no policies and generic warnings for SECURITY DEFINER views/functions. The no-policy tables are intentionally deny-by-default because anonymous and authenticated table privileges are revoked. The public views are intentional privacy-safe projections; they must bridge the locked-down internal tables and are restricted to approved columns. The public profile RPC exposes only the same curated profile contract. Reviewer action RPCs are executable by authenticated users but enforce `require_reviewer()` or `is_reviewer()` within the function body.

These notices should remain monitored, but they are not evidence of public raw-table exposure under the verified grants and projections.

## Verification

The remediation passed `npm run check`, including typechecking, dependency-boundary enforcement, 67 ordinary tests, and the production build. `git diff --check` passed. A repeated canonical database authorization query confirmed all ten direct-read, privileged-RPC, and public-projection assertions.

## Remaining operational recommendations

GitHub’s secret-scanning alert endpoint was inaccessible to the task’s current integration, and GitHub reported that code scanning and Dependabot alerts are disabled for this private repository. Enable repository secret scanning, Dependabot alerts, and a CodeQL workflow in GitHub when the repository plan and owner permissions permit it. Continue rotating credentials supplied outside the repository and never commit production environment files.
