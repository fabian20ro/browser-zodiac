# Iteration Log

> Append-only journal of AI agent work sessions.
> **Add an entry at the end of every iteration.**
> Same issue 2+ times? Promote to `LESSONS_LEARNED.md`.

## Entry Format

---

### [YYYY-MM-DD] Brief Description

**Context:** What was the goal
**What happened:** Key actions, decisions
**Outcome:** Success / partial / failure
**Insight:** (optional) What would you tell the next agent?
**Promoted to Lessons Learned:** Yes / No

---

### [2026-05-12] Make midnight scheduler cancelation authoritative

**Context:** A small reliability pass on `src/engine/scheduler.ts`.
**What happened:** Fixed `scheduleMidnightGmt()` so cancelation still stops future midnight reschedules even when `cancel()` is called from inside the callback itself. Added a regression test that advances fake timers across midnight and confirms no second callback fires after cancelation.
**Outcome:** Success — the midnight scheduler now respects cancelation on the callback path.
**Insight:** Recursive timeout schedulers need an explicit cancelled flag; clearing the current handle alone does not prevent the callback from re-arming the next timeout.
**Promoted to Lessons Learned:** Yes

---

### [2026-05-08] Guard action-button clicks against rejection

**Context:** A small UI hardening pass on `src/ui/actions.ts`.
**What happened:** Wrapped `createActionButton()` click handlers in `try/catch` so a rejected async action no longer leaves an unhandled promise rejection or accidentally shows success feedback. Added a regression test covering the rejected-action path.
**Outcome:** Success — behavior is now stable when an action fails.
**Insight:** UI helper buttons should treat rejected async callbacks as a failure path, not as a success with missing feedback.
**Promoted to Lessons Learned:** Yes

---

### [2026-03-04] Externalize grammar data to text files

**Context:** Grammar data (~37-42 symbols per locale) was hardcoded in TypeScript locale files. Goal: move to external text files for easier editing, extensibility, and future CDN delivery.
**What happened:** Designed section-based text format (`=== symbol ===` headers), created grammar-loader module with `@include` support for splitting large sections, moved all grammar data to `public/data/{locale}.txt`, made app init async with `loadAllGrammars()`. Added 29 new tests including data file integrity checks.
**Outcome:** Success — 90 tests passing, build succeeds, data files served as static assets.
**Insight:** When adding Node-only imports (`node:fs`, `node:path`) to test files in a browser-targeted project, exclude test files from `tsconfig.json` (`"exclude": ["src/**/*.test.ts"]`). The `tsc` build check doesn't need to type-check test files since Vitest handles that separately. Also: plan mode may discard files created before `ExitPlanMode` — recreate them after approval.
**Promoted to Lessons Learned:** Yes (tsconfig exclude pattern)

---

### [2026-03-04] Fix Romanian gender mismatches and expand phrase variety

**Context:** Romanian horoscope templates had gender agreement bugs — possessive pronouns (ta/tău) and object clitics (-l/-o) were hardcoded in parent templates, but child symbols contained entries of mixed grammatical gender. Additionally, many symbol sections had only 5-8 entries causing repetitive output.
**What happened:** Created three new gender-variant symbols (`parteCorpTa`, `aspectViataTa`, `dispozitivulTau`) following the established pattern of embedding gendered elements in symbol entries. Updated all affected templates to use these variants. Restructured templates with object pronoun clitics (`verifică-l`, `Ține-l`) to avoid gendered forms entirely. Added ~100+ new entries across all 40+ symbol sections while maintaining gender agreement.
**Outcome:** Success — 112 tests passing, build succeeds, all gender mismatches resolved.
**Insight:** Romanian gender agreement in CFG-based systems should always be handled by creating variant symbols (e.g., `symbolTa`, `symbolTau`) rather than hardcoding gendered words in templates. The pattern: bare symbol for gender-neutral contexts, variant symbol with possessive/article embedded for gendered contexts. Keep bare and variant symbols in sync when adding new entries.
**Promoted to Lessons Learned:** Yes (Romanian gender variant symbol pattern)

---

### [2026-03-09] Reliability + i18n accessibility + PWA hardening

**Context:** Implement fixes 1, 2, 3, 5, and 6: startup failure handling, truthful copy feedback, localized accessibility labels, real PWA support, and build-time grammar integrity enforcement for both locales.
**What happened:** Added startup `loadAllGrammars()` error fallback with retry in `src/main.ts`; made action buttons await async outcomes and only show success feedback when the result is not false; localized aria-label strings by extending `UIStrings` and wiring `createTopBar`/`createDivinationPanel` to locale text; added `public/manifest.webmanifest`, `public/sw.js`, and service worker registration; introduced `scripts/validate-grammar.mjs` that recursively validates symbol references from roots and enforces minimum 5 entries per symbol for `en`/`ro`, then wired it into `build` via `npm run validate:grammar && tsc && vite build`. Updated/added tests in UI suites for new behavior.
**Outcome:** Success — `npm test`, `npm run validate:grammar`, and `npm run build` all pass.
**Insight:** Recursive grammar validation must account for runtime-injected symbols (e.g., `signName`, divination symbols) or it will incorrectly fail static checks for unresolved references.
**Promoted to Lessons Learned:** No

### [2026-03-09] Corecturi RO: gen/articol/capitalizare în șabloanele de gramatică

**Context:** Utilizatorul a semnalat multe probleme de gen, articulare și capitalizare în variantele românești generate din `public/data/ro.txt`.
**What happened:** Am corectat formulări și acorduri în seturile de variante: ghilimele românești închise corect pentru `#intelepciune#`/`#mantra#`, articol + gen la întâlniri (`o hologramă a bunicii...`), typo adjectival (`suspicios de calm`), typo/nuanță la culoare (`portocaliu care te judecă`), plural articulat (`adaptoare USB`), și formulări mai naturale în `reactieColegi` (`pretinde că nu observă`, `da vina pe stagiar`, `face o memă`).
**Outcome:** Success — textele RO sunt mai consistente gramatical și tipografic pe opțiunile folosite de generator.
**Insight:** În fișierele de gramatică pe bază de variante, problemele de articulare apar frecvent la simboluri reutilizate în contexte diferite; merită validate separat categoriile „cu articol” vs „fără articol”.
**Promoted to Lessons Learned:** No

### [2026-03-09] Double data entries + create comedian agent

**Context:** User requested doubling the number of options in `en.txt` and `ro.txt` data files, creating a comedian sub-agent, and using both the linguist and comedian agents to improve content quality with more absurdist humor.
**What happened:** Created `.claude/agents/comedian.md` following agent-creator conventions — focused on deadpan, surreal humor (Monty Python / Douglas Adams energy) with actionable principles: mundane-cosmic juxtaposition, anthropomorphizing the inanimate, bureaucratizing the magical, deadpan delivery. Registered in AGENTS.md. Then doubled all sections in both `en.txt` and `ro.txt` (~45 sections per locale). Applied linguist lens for Romanian: kept all variant symbols (`parteCorpTa`, `aspectViataTa`, `dispozitivulTau`, `obiectCuArticol`, `obiectMisterios`) in sync with their base counterparts, maintained proper gender agreement (articles, possessives). Applied comedian lens: new entries use juxtaposition (printer that works out of spite), anthropomorphism (spreadsheet that has seen things), bureaucratic-cosmic fusion (cease-and-desist from the future), and deadpan absurdity (your bodyPart will receive a notification). Grammar validation passes for both locales.
**Outcome:** Success — all sections approximately doubled (from ~10-17 to ~18-34 entries each, except static number sections). Grammar validation passes. Tests could not be run due to missing `node_modules` (offline network).
**Insight:** When doubling Romanian grammar data, the variant symbol pattern (`symbolTa`, `dispozitivulTau`, `obiectCuArticol`, `obiectMisterios`) creates a multiplicative burden — each new `obiect` entry requires corresponding entries in 3 variant sections with correct articles, possessives, and adjective positions. Planning the base entries first then systematically generating variants is more reliable than trying to write all 4 in parallel.
**Promoted to Lessons Learned:** No

### [2026-03-10] Refactor grammar loader to use `@from` + letter-range file splitting

**Context:** The data files (`en.txt`, `ro.txt`) grew to ~1000+ lines each after doubling entries. Managing them became difficult. User requested splitting them into 300-500 line chunks using a new `@from <file> import *` syntax where imported files contain entire sections, allowing parallel loading.
**What happened:** 
1. Rewrote `grammar-loader.ts` to support `@from` directives at the top level of the file instead of per-section `@include`. The loader now parses the main file to find all imports, fetches them in `Promise.all` parallel, parses them with the same function, and merges all sections together.
2. Rewrote `validate-grammar.mjs` and `grammar-loader.test.ts` to mirror this logic, including tests for merging duplicate sections across files.
3. Wrote a Python script to split the data files automatically:
   - Kept "structural" sections (e.g. `origin`, `opening`, `prediction`, `consequence`, `advice`) in the main `en.txt`/`ro.txt`.
   - Moved "vocabulary" sections into letter-range sub-files (e.g. `ro/a-c.txt`, `ro/d-l.txt`, `ro/m-p.txt`, `ro/r-w.txt`) to keep chunks under 500 lines.
4. `npm run validate:grammar` passed successfully on the split data.
**Outcome:** Success — loading is now parallelized and data files are modularly split by letter range. Note: `vitest` unit tests couldn't be run because of persistent network/NPM offline issues (`ENOTFOUND registry.npmjs.org`), but local validation passed.
**Insight:** Separating structural text generation templates from raw vocabulary lists makes the data much more maintainable. The top-level import model is both simpler to parse and faster to load than the older per-section nested include model.
**Promoted to Lessons Learned:** No

### [2026-05-13] Clarify regenerate behavior in README

**Context:** Small docs-only maintenance for the horoscope app.
**What happened:** Updated the README feature copy so the daily horoscope description matches runtime behavior more closely: the baseline reading is stable per sign/day, while the Regenerate button re-rolls it via the consultation counter.
**Outcome:** Success — docs now describe the initial deterministic daily reading and the explicit reroll path.
**Insight:** When the app has a stable daily baseline plus an intentional reroll control, the README should name both so readers do not assume regeneration is identical to the first draw.
**Promoted to Lessons Learned:** No

---

### [2026-05-13] Fix iOS UA detection precedence

**Context:** Small reliability pass on `src/divination/browser-oracle.ts`.
**What happened:** Moved the iPhone/iPad branch ahead of the `Mac OS` check in `detectOS()` so iPhones and iPads are classified as iOS even though their user agents include `Mac OS X`. Added a focused jsdom test covering both iOS and desktop macOS user agents.
**Outcome:** Success — browser OS detection now respects mobile UA precedence.
**Insight:** UA substring checks need the most specific mobile identifiers before generic desktop substrings, especially for Apple devices.
**Promoted to Lessons Learned:** Yes

---

### [2026-05-13] Fix Android UA precedence in browser oracle

**Context:** Small reliability pass on `src/divination/browser-oracle.ts`.
**What happened:** Moved the Android branch ahead of the generic Linux check in `detectOS()` so Android browsers are recognized correctly even though their user agents often contain `Linux`. Added focused jsdom coverage for Android and desktop Linux user agents alongside the existing iOS/macOS cases.
**Outcome:** Success — browser OS detection now respects both Apple and Android UA precedence.
**Insight:** UA substring checks need the platform-specific mobile identifiers before generic desktop substrings for both Apple and Android families.
**Promoted to Lessons Learned:** Yes

---

### [2026-05-14] Normalize locale ids across i18n lookup and storage

**Context:** Small reliability pass on `src/i18n/index.ts` and its tests.
**What happened:** Added locale-id normalization for `getLocale()`, `detectLanguage()`, and `persistLanguage()` so mixed-case or padded ids still resolve correctly. Added jsdom tests covering stored-language normalization, browser-language normalization, and the uppercase `getLocale('RO')` lookup path.
**Outcome:** Success — locale resolution is now tolerant of legacy casing and storage drift.
**Insight:** Locale ids behave like user input at the boundary; normalize them once at lookup and persistence points instead of relying on callers to be perfectly clean.
**Promoted to Lessons Learned:** Yes

---

### [2026-05-14] Trim browser language before locale prefix

**Context:** Small i18n boundary hardening in `src/i18n/index.ts`.
**What happened:** Updated `detectLanguage()` to normalize the full `navigator.language` value before taking the two-letter prefix, then added a regression test for whitespace-padded browser language ids.
**Outcome:** Success — browser-language detection now tolerates leading/trailing whitespace as well as mixed case.
**Insight:** When extracting a locale prefix from browser input, trim first and then slice; slicing raw input can hide whitespace normalization bugs.
**Promoted to Lessons Learned:** Yes

### [2026-05-14] Catch unmatched grammar delimiters in validation

**Context:** Small maintenance pass on the grammar validation script.
**What happened:** Added a validation check in `scripts/validate-grammar.mjs` to reject entries with an unmatched `#` delimiter before they reach the runtime grammar engine. Confirmed the current EN/RO data still passes validation.
**Outcome:** Success — malformed template delimiters will now fail fast during the grammar audit.
**Insight:** Grammar content should be validated for delimiter balance as well as missing symbols; otherwise broken templates can slip through static reference checks.
**Promoted to Lessons Learned:** Yes

---

<!-- New entries above this line, most recent first -->

### [2026-03-09] Fix Romanian agreement/uppercase issues + light theme contrast/header spacing

**Context:** User reported Romanian grammar agreement mistakes and stray uppercase mid-sentence in generated horoscope text, plus low contrast gold-on-light theme and title block positioned too low.
**What happened:** Updated `public/data/ro.txt` to fix agreement and phrasing (`un parcometru filozofic`, `la #locatie#`), lowercased `celebritate` entries to avoid random uppercase in sentence middle, capitalized only where sentence-initial via `#celebritate.capitalize#`, and removed a gender-sensitive pattern by rewriting to "energia de la #celebritate#". Updated `src/style.css` light palette (`--gold`, `--gold-dim`) for stronger contrast, introduced `--title-shadow` token with a subtler light-mode value, and reduced top spacing (`.app__wrapper` padding/gap and `.header` top padding) so title sits higher. Ran grammar validation and production build; captured updated light-mode screenshot.
**Outcome:** Success — text quality issues fixed and light-mode visual hierarchy/contrast improved.
**Insight:** For mixed-content symbols that are reused sentence-internally and sentence-initially, keep entries lowercase and apply `.capitalize` only at template call sites that require it.
**Promoted to Lessons Learned:** No

---

### [2026-03-09] Tighten header spacing and reduce decorative stars for mobile

**Context:** User requested removing wasted vertical space between the top controls and title area, moving the title block higher, and reducing decorative stars so they fit better on phones.
**What happened:** Updated header decoration in `src/ui/components.ts` from 5 glyphs to 4, then tightened vertical spacing in `src/style.css` by reducing top wrapper padding/gap, removing extra top header padding, and slightly compacting stars/subtitle margins. Captured an updated UI screenshot and re-ran targeted tests/build.
**Outcome:** Success — header content now sits higher with less dead space, and star row is slimmer for smaller screens.
**Insight:** Small combined spacing reductions across wrapper + header + decoration are less visually disruptive than a single large padding cut while still reclaiming meaningful vertical space.
**Promoted to Lessons Learned:** No

---

### [2026-03-09] Follow-up: pull title block higher than top bar baseline

**Context:** After previous spacing tweak, user reported the title area still felt too low relative to the flag/theme row.
**What happened:** Further reduced top vertical spacing in `src/style.css` by tightening `.app__wrapper` top padding and inter-section gap (desktop + mobile), adding a small negative top offset on `.header`, and compressing star/subtitle margins.
**Outcome:** Success — header block now starts noticeably higher, closer to the controls row while preserving readability.
**Insight:** When users compare hero position against fixed top controls, a subtle negative margin on the hero container can solve perceived alignment faster than only shrinking global wrapper padding.
**Promoted to Lessons Learned:** No

### [2026-05-12] Clarify UTC-day wording in README

**Context:** A small docs pass on `README.md`.
**What happened:** Updated the feature description for daily horoscopes to say the same sign gets the same horoscope for the same UTC day, matching the ISO-date seeding and GMT/UTC midnight scheduling in the runtime.
**Outcome:** Success — the README now states the time boundary explicitly.
**Insight:** Time-based user-facing docs should name the actual day boundary used by the code, especially when the app keys behavior off UTC rather than local time.
**Promoted to Lessons Learned:** Yes

---

### [2026-03-10] Service worker cache TTL with stale refresh

**Context:** User requested time-based expiration for `public/sw.js` cached responses (3-minute TTL), keeping non-GET/cross-origin bypass behavior unchanged, and bumping cache version.
**What happened:** Updated service worker to use versioned content + metadata caches, store per-request timestamps in a dedicated metadata cache, and enforce TTL checks in the fetch handler before serving cached responses. Added stale-refresh behavior that fetches network data, replaces cache entry, and updates timestamp; added install-time timestamp population for precached assets; bumped cache versions and activate cleanup to remove old caches.
**Outcome:** Success — implemented TTL flow with stale refresh and preserved existing bypass logic.
**Insight:** If metadata is missing (e.g., legacy cache entries), treating the entry as stale ensures safe migration to TTL-based caching without special-case migration code.
**Promoted to Lessons Learned:** No

### [2026-03-10] Force service-worker rollout for 3-minute file cache

**Context:** User requested setting file cache duration to 3 minutes and noted earlier PR merge conflicts left implementation incomplete.
**What happened:** Verified both static headers (`public/_headers`) and runtime service-worker TTL (`public/sw.js`) are 3 minutes (`max-age=180` and `3 * 60 * 1000`). Updated service-worker cache namespace versions from `v2` to `v3` for both content and metadata caches so clients reliably activate the 3-minute TTL behavior after update.
**Outcome:** Success — 3-minute cache policy is now enforced with a guaranteed cache namespace bump for rollout.
**Insight:** When cache-policy logic already exists but rollout is inconsistent, bumping cache names is the safest way to force old clients off stale cache state.
**Promoted to Lessons Learned:** No

- 2026-05-05: Audit RO acord/articol. Fix: eliminat construcții "a lui #planeta#"; rescris formă cu slash de gen ("preaprobat/ă") în formulare neutră.

- 2026-05-05: Follow-up audit. Observat regresie: eliminarea lui "lui" a păstrat totuși construcții imposibile cu intrări articulate (#planeta#) în genitiv. Fix: eliminat complet dependența de #planeta# în cele 2 template-uri.

---

### [2026-05-11] Reset transient feedback timers on repeat clicks

**Context:** A small UI hardening pass on `src/ui/actions.ts`.
**What happened:** Added timeout cancellation and base-state reset at the start of each `createActionButton()` click so stale success/error feedback cannot linger or revert too early when a button is clicked again before its prior timeout expires. Added a regression test covering the repeat-click timing case.
**Outcome:** Success — transient feedback now behaves predictably across rapid repeated clicks.
**Insight:** Temporary button feedback needs two safeguards: cancel the old timer and reset the control to its base state before running the next action.
**Promoted to Lessons Learned:** Yes

### [2026-05-11] Default reusable action buttons to type=button

**Context:** Small UI hardening pass on `src/ui/actions.ts`.
**What happened:** Set `createActionButton()` to `type="button"` so the reusable helper can't accidentally submit a surrounding form, and added a regression test covering the default button type.
**Outcome:** Success — action buttons are now safer as generic reusable controls.
**Insight:** Reusable buttons should opt out of implicit form-submit behavior unless they are intentionally form submits.
**Promoted to Lessons Learned:** Yes
