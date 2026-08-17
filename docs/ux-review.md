# Ottawa Tech Map UX Review

## Scope

This review evaluated the existing web renderer in `src/apps/web/index.ts` against the product goal: company discovery first, interpretable signals second, and provenance always available. The work preserves the existing typed inputs, Supabase schema, production architecture, and database-as-source-of-truth boundary.

## Highest-impact UX problems identified

| Priority | Problem in the original prototype | User impact | Implemented response |
|---|---|---|---|
| 1 | The prototype opened directly on a sparse company profile and had no discovery entry point. | A new user could not understand what the product was for or how to find a company within the first few seconds. | Added a search-first discovery view with a clear product proposition, indexed-search language, and a visible search action. |
| 2 | Evidence was presented as an undifferentiated block of fields. | Users had to parse raw markup to understand what the signal meant. | Reframed each item as an observed signal with a clear heading, structured metadata, and a readable evidence card. |
| 3 | Confidence was shown as an unexplained percentage. | Users could mistake signal confidence for a company score or business-quality ranking. | Renamed it to “validation confidence” and explicitly state that confidence describes the signal, not the company. |
| 4 | The provenance relationship was implicit rather than visible. | Users could see a source link, but not the product’s evidence-led mental model. | Added a provenance cue: signal → source record → open original source. |
| 5 | Missing evidence rendered as a blank section. | Blank space could be interpreted as a loading failure or missing implementation. | Added an explicit, honest empty state that says the profile exists but no published evidence is available yet. |
| 6 | “Company not found” had no recovery path. | A failed lookup ended the exploration journey. | Added a human-readable explanation and a “Back to discovery” recovery link. |
| 7 | The review queue was visually indistinct from ordinary content and had no empty state. | Data-quality workflow was harder to scan, and an empty queue was ambiguous. | Added a data-quality heading, amber review treatment, candidate-match hierarchy, source links, and an explicit empty queue state. |
| 8 | The map could have become the implied primary navigation even though the product thesis is search-led. | Users might interpret the product as a geographic visualization instead of an intelligence product. | Added a compact navigation where Discover is primary and Map is a secondary feature link. No map data or geography was invented. |
| 9 | The original document had no responsive or accessibility-oriented structure beyond basic HTML. | The experience was fragile on smaller screens and less clear for assistive technologies. | Added semantic headings, labelled forms, `time` elements, `aria-current`, viewport metadata, keyboard focus styling, and responsive layouts. |

## Significant design decisions

### Search before map

The new discovery renderer establishes a clear first action: search for a company by name or domain. The map is retained as a secondary navigation destination rather than promoted into the hero or primary content area. The empty discovery state deliberately avoids showing fabricated “featured” companies or signals.

### Evidence cards instead of scorecards

The company profile emphasizes observed signals, dates, contract type, source, and validation confidence. It does not introduce growth scores, rankings, badges, or inferred relationships. The visual treatment separates the signal itself from the provenance and from the explanation of confidence.

### Honest absence

The renderer now distinguishes between “not found,” “profile exists but has no evidence,” “search results are awaiting a query,” and “review queue is empty.” Each state tells the user what happened and what they can do next, without implying data that is not present.

### Provenance as a first-class interaction

Source links remain tied directly to the supplied source URL. The interface adds explanation around that link but does not create a second data store, proxy content, or client-side enrichment. Existing HTML escaping is preserved for user- and source-controlled values.

### Thin presentation layer

The implementation changes only the presentation layer and adds renderer tests. It does not change Supabase migrations, tables, views, ingestion behavior, scoring policy, or external-source access. The new discovery form is a UI contract for the existing indexed-search boundary; wiring search results remains the responsibility of the existing application layer.

## Validation

The repository passed `npm run typecheck` and `npm test`. The final suite reports **31 passing tests**, **6 skipped integration tests**, and includes four new web-renderer tests covering discovery, provenance, honest empty states, and the empty review queue.
