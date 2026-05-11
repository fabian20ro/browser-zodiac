# Lessons Learned

> Maintained by AI agents. Contains validated, reusable insights.
> **Read at the start of every task. Update at the end of every iteration.**

## How to Use This File

### Reading (Start of Every Task)
Read this before writing any code to avoid repeating known mistakes.

### Writing (End of Every Iteration)
If a new reusable insight was gained, add it to the appropriate category.

### Promotion from Iteration Log
Patterns appearing 2+ times in `ITERATION_LOG.md` should be promoted here.

### Pruning
Obsolete lessons → Archive section at bottom (with date and reason). Never delete.

---

## Architecture & Design Decisions

<!-- Format: **[YYYY-MM-DD]** Brief title — Explanation -->

**[2026-03-04]** Grammar data lives in `public/data/` — Grammar rules are loaded at runtime from section-based `.txt` files via `fetch()`, not compiled into the JS bundle. This allows editing without rebuilding and provides a natural CDN migration path. UI strings remain in TypeScript for type safety. The `@include` directive supports splitting large sections into separate files under `public/data/{locale}/`.

## Code Patterns & Pitfalls

<!-- Format: **[YYYY-MM-DD]** Brief title — Explanation -->

**[2026-03-04]** Romanian gender: use variant symbols, not template-level pronouns — When a template needs a gendered possessive (ta/tău/tale) or object clitic (-l/-o) next to a mixed-gender symbol, create a variant symbol with the gendered element embedded in each entry (e.g., `parteCorpTa` alongside bare `parteCorp`). Pattern: `#symbolTa#` replaces `#symbol# ta`. Keep bare and variant symbols in sync. For object clitics, prefer restructuring the template to avoid them entirely (e.g., "aruncă o privire" instead of "verifică-l").

**[2026-05-08]** Catch rejected async UI actions in helpers — `createActionButton`-style wrappers should handle callback rejections deliberately so a failed `Promise` does not become an unhandled rejection or a false success state. Keep the control visually stable on failure and cover the rejection path in tests.

**[2026-05-11]** Transient feedback buttons need timer cancellation on reactivation — If a control shows temporary success/error feedback after async completion, clear any pending revert timer and reset to the base icon/class at the start of a new click. Otherwise an older timeout can restore the stale state too early or leave the previous feedback visible after a new failed/no-op action.

**[2026-05-11]** Clipboard helpers should return `false` when the Clipboard API is unavailable — `navigator.clipboard` may be missing in older browsers or restricted contexts. Wrap the write in `try/catch` (or preflight the API) so UI actions can treat missing clipboard support as a recoverable outcome instead of a hard throw.

## Testing & Quality

<!-- Format: **[YYYY-MM-DD]** Brief title — Explanation -->

**[2026-03-04]** Exclude test files from tsconfig build — When test files use Node-only modules (`node:fs`, `node:path`) in a browser-targeted project, add `"exclude": ["src/**/*.test.ts"]` to `tsconfig.json`. Vitest type-checks tests separately; `tsc` in the build script doesn't need to.

## Performance & Infrastructure

<!-- Format: **[YYYY-MM-DD]** Brief title — Explanation -->

## Dependencies & External Services

<!-- Format: **[YYYY-MM-DD]** Brief title — Explanation -->

## Process & Workflow

<!-- Format: **[YYYY-MM-DD]** Brief title — Explanation -->

---

## Archive

<!-- Format: **[YYYY-MM-DD] Archived [YYYY-MM-DD]** Title — Reason for archival -->

**[2026-05-05]** Evită genitivul fix „lui” înainte de simboluri mixte — Pentru simboluri românești cu intrări eterogene (nume proprii + grupuri nominale cu articol), evită template-uri de tip „a lui #simbol#”. Preferă reformulare neutră: „din interiorul #simbol#”, „de pe #simbol#”, „de la #simbol#”.

**[2026-05-05]** Pentru simboluri cu articol inclus, evită complet cadrele care cer caz (genitiv/dativ) — Chiar și fără "lui", formele ca „din interiorul #simbol#” pot eșua („din interiorul un ...”). Soluție robustă: template fără acel simbol sau cu reformulare fără caz.
