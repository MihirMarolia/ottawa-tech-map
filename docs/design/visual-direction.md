# Visual Direction

The design decisions already made for the web surface, written down so they
don't have to be re-derived from chat history by the next session — human or
agent. This is a companion to `docs/architecture/frontend-boundary.md` (what
the web app may do) and `docs/ux-review.md` (why the original prototype
changed) — this document is specifically *what it should look like and why*.

**Status:** this supersedes an earlier dark-navy "technology dashboard"
direction. The system below — warm archival paper, orange as the single
structural accent — is current. It is implemented in
`src/apps/web/directory.ts` (shared layout, stylesheet, the `.row` /
`.stat-tile` / `.citation` primitives), `src/apps/web/map.ts`, and
`src/apps/web/government-intent.ts`.

## Genre: civic research archive, not SaaS

The product should read as an institutional research publication, an
archival catalogue, or a city economic-development report — not a SaaS
dashboard, a startup landing page, or a venture-capital database. The
interface should communicate **documented → structured → inspectable →
trustworthy**, not **exciting → optimized → high-growth → persuasive**.

There is no visual language that implies a company is ranked, scored, or
judged unless the underlying data model explicitly supports that
interpretation — this was already true in `docs/out-of-scope/rejected-ideas.md`
and remains the hard constraint every other decision below is subordinate to.

**The primary reference is the editorial/institutional character of the RISD
Standards site** — its typography, paper-like surfaces, structural rules,
generous negative space, and publication-style composition. The reference
establishes a visual language, not a template: exact compositions, exact
navigation, exact colors, and exact spacing are not copied.

## Core principle: the digital printed page

The interface behaves like a printed research publication that became
interactive: warm paper, ink, editorial typography, rules and dividers,
numbered sections, marginal metadata, large headings, deliberate whitespace.
The page has an observable underlying grid. **The page itself is the primary
surface** — components sit within it rather than floating above it as
isolated cards.

## Color

Defined once in `renderPageLayout`'s `:root` block
(`src/apps/web/directory.ts`), shared by every page:

| Token | Value | Meaning |
|---|---|---|
| `--paper` | `#F1E4C8` | Dominant background — warm, never pure white |
| `--paper-light` | `#F7EEDB` | Form fields, the map's water field |
| `--paper-dark` | `#E5D3B0` | The map's Ottawa hub fill |
| `--ink` | `#241A14` | Primary typography — dark brown, never pure black |
| `--ink-soft` | `#55463A` | Body copy, descriptions |
| `--ink-faint` | `#6B5A48` | Metadata, timestamps, zero/absent values |
| `--orange` | `#C45124` | Focus rings and other non-text affordances only |
| `--orange-dark` | `#8E351A` | All orange *text*: active nav, eyebrows, source links, fixture-disclosure badges, button fills |
| `--orange-light` | `#D97845` | Source-link underline |
| `--rule` | `#B99F7D` | Every horizontal/vertical rule and border |
| `--white` | `#FFF9EC` | Text on solid orange fills |

**Deviation from the literal spec, and why:** the originally proposed
`--ink-faint: #806F5D` measures 3.83:1 against `--paper` — it passes WCAG AA
only for large text, and this token is used for small metadata (11–13px).
It was darkened to `#6B5A48` (5.24:1). Likewise, `--orange` on white text
measured 4.40:1 (just under the 4.5:1 small-text minimum), so solid button
fills and every orange *text* use go through `--orange-dark` (7.48:1 / 6.23:1
respectively); plain `--orange` is reserved for non-text marks (focus
rings, map pins) where the bar is 3:1. The token *relationships* are
unchanged — only these two values were tuned, deliberately, for contrast.

**Orange is structural and semantic, not decorative.** It marks: active
navigation, section eyebrows, source citations, fixture disclosure, and
interactive affordance on hover/focus. It is not applied to every number —
see Statistics below.

## Type

A deliberate pairing, unchanged from the prior direction and still the
single most important anti-"AI slop" decision in this codebase:

- **`--serif`**: `"Iowan Old Style","Palatino Linotype","Book Antiqua",Georgia,ui-serif,serif` —
  brand wordmark, all headings, company names (in rows, in profile), stat
  numerals in the directory hero.
- **`--sans`**: `-apple-system,"Segoe UI",Roboto,Helvetica,ui-sans-serif,system-ui,sans-serif` —
  navigation, filters, metadata, labels, evidence citations, buttons.
- **`Inter` remains permanently banned.** Reintroducing it is a regression,
  not a neutral default choice — it is the single most common tell of an
  undirected AI-generated interface.

## Layout primitives

Three surfaces, deliberately different, so affordance always matches actual
behavior — replacing the earlier `.card`-everywhere approach:

- **`.row`** (`renderCompanyRow` in `directory.ts`) — the directory's
  primary unit: a numbered catalogue entry (index, name, description,
  metadata, real Evidence count), the whole row a link. Flat, ruled
  top-and-bottom, **no shadow, no hover-lift, no transform** — only a color
  shift and underline on the name. Used identically by the Company
  directory, the Map's company list, and the Government Intent monitor, via
  the shared `.row`/`.directory-list` CSS.
- **`.citation`** (`renderEvidence` in `directory.ts`) — one Evidence
  record, styled as a document citation (date, type, statement, Source
  link), flat and ruled, **no hover state at all** — it doesn't go
  anywhere. No "hot" or urgency-coded treatment.
- **`.stat-tile` / `.statgrid`** — a bare figure: one large tabular numeral
  plus a small caps label, **unboxed** (no background, no border, no
  radius) — divided from its neighbors by a single vertical rule, not a
  card border. A number occupies space on the page; it does not live in a
  KPI widget.

`.card` in the old sense (a bordered, shadowed, hover-lifting rounded
rectangle) no longer exists in this stylesheet. Do not reintroduce it as
the default container for anything — the default container is the page,
the row, or the rule.

## Data-viz rule: every visual property must answer a real question

Before encoding anything with size, color, or position, answer: **what real,
already-persisted field does this represent?** If the answer is unclear,
don't encode it.

- `/map` sizes each company pin by `company.evidence.length` — a single
  orange mark (`#C45124`), 7–16px radius, uniform hue. There is no
  categorical rainbow-by-sector coloring anymore (that read as a SaaS
  chart technique, not an atlas) — every mark on the page means the same
  thing: more Evidence, bigger mark.
- No sparklines, trend lines, gauges, or "hot" indicators anywhere. This
  project has no time-series data to back a trend — inventing one to make a
  page look more alive would be a fabrication, not a design choice, and
  would violate the same evidence-provenance rule that governs the rest of
  the system.

## Statistics and zero values

Large numerals are appropriate only for real, persisted counts (see
`renderStatTile`). **Not every statistic is orange** — the default numeral
color is `--ink`; orange is not the default emphasis for a KPI-style count.
A count of zero is a legitimate data state: it renders in `--ink-faint`
(muted), never disappears, never turns into a dash, and never reads as a
warning. This was already the rule under the prior direction and remains
unchanged — only the color values did.

## Badges

Extremely limited. No "Hot," "Trending," or "Featured" — nothing that
manufactures hierarchy the data model doesn't support. The only badge in
current use is the fixture-disclosure tag ("Fictional test fixture" /
"Contains fictional fixture"), which is a real, data-backed classification
(a safety-critical disclosure, not a hype label) and is styled with an
orange border specifically so it stands out from ordinary metadata.

## Accessibility baseline (non-negotiable)

- `:focus-visible` outlines are defined globally, using `--orange` (the one
  permitted non-text use), 2px, offset 3px.
- `@media (prefers-reduced-motion: reduce)` disables all transitions and
  animation.
- Nav marks the current page with `aria-current="page"`, styled with both a
  color change and an underline — never color alone.
- Map SVG pins carry `aria-label` and `<title>` text naming the company and
  its real Evidence count, not just a coordinate.
- Every color pairing actually used for text was checked against WCAG AA
  before being adopted (see the Color deviation note above) — this is a
  standing requirement for any new color introduced later, not a one-time
  pass.

## What was deliberately not built

The RISD reference and the archival-paper direction license a strong
aesthetic; they do not license inventing new pages, links, or numbers that
aren't backed by this app's real routes and data:

- No new nav destinations (an "Evidence," "Methods," or "About" route) were
  added — the illustrative nav mockups in the source design brief are
  placeholders, not a mandate to build pages that don't exist yet. The
  existing three destinations (Index, Government Intent, Map) were
  restyled, not expanded.
- No fabricated "catalogue number" was added to the company profile header
  (e.g. "COMPANY / 042") — this app has no stable per-company sequential
  identifier, and inventing one for decoration would contradict the
  document's own rule that every number must correspond to real data.
  Numbered indexing (`01`, `02`, ...) is used only on directory/list rows,
  where it is explicitly a current-listing position, not a persistent ID.
- The footer states only what's actually true of the system (evidence-first,
  no raw source content collected) — it does not link to a methodology or
  about page that doesn't exist yet.
