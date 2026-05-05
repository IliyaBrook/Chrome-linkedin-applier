# Migration plan — Easy Apply LinkedIn → WXT + React + Tailwind

This file is the **active TODO list**. As phases and sub-tasks land, the corresponding sections are **deleted from this file** (not ticked, not crossed out). The file shrinks until empty — that's how you know migration is done.

Always work the **first uncompleted sub-task** in the **earliest remaining phase**. Don't jump phases.

> Reference: `CLAUDE.md` for conventions, `.claude/rules/` for detailed rules, `MIGRATION_AUDIT.md` (produced in Phase 1) for behavioral spec.

---

## Phase 4.7 — Manual verification on LinkedIn (remaining)

**Code port landed**: every module from sections B, C, D of [`PHASE_4_7_PLAN.md`](PHASE_4_7_PLAN.md) is ported into `entrypoints/linkedin.content/{dom-utils,loaders,modals,linkedin-dom,save-modal,run-state,form-fillers,run-script}.ts`. `index.tsx` now binds `window.runScript` to the real `runScript(state)` flow. Type-check, ESLint, vitest suite (146 tests), and `pnpm build` all green.

**Verification still pending** (requires real LinkedIn access — not unit-testable):

- Load both old (v2.2) and new (`.output/chrome-mv3`) builds in the same Chrome profile.
- On `/jobs/search/?keywords=...`: click ▶ in the popup, confirm `runScript` iterates cards, applies title/skip/bad-word filters, opens Easy-Apply modals, fills inputs/radios/dropdowns/checkboxes via stored configs, picks the right CV (smart-select on/off), submits, watches for the "Your application was sent" modal, advances to the next page.
- Same flow on `/jobs/search-results/` (new SDUI shadow-DOM UI).
- Edge cases: empty filter lists, daily limit reached (red border blink), external-apply jobs (saved into External Apply list), already-applied cards, save-application modal handling, extension context invalidation.
- Tick the corresponding rows in [`tests/PARITY_CHECKLIST.md`](tests/PARITY_CHECKLIST.md).

**Delete this Phase 4.7 block once the parity walk confirms no regressions.**

---

## Phase 5 — Parity tests (manual run remaining)

Code deliverables landed:
- [`tests/PARITY_CHECKLIST.md`](tests/PARITY_CHECKLIST.md) — 70 rows from audit § 8 with old/new behavior side-by-side.
- [`tests/MANIFEST_DIFF.md`](tests/MANIFEST_DIFF.md) — old vs `pnpm build` manifest comparison; no new permissions.
- [`scripts/seed-storage.ts`](scripts/seed-storage.ts) — pasteable seed for reproducible parity runs.

Still TODO:
- **Phase 5.2 manual run.** Load both extensions in one Chrome profile, walk each 🔍 row in the checklist, flip to ✅ as confirmed. ❌ rows depend on Phase 4.7 finishing first.

---

## Phase 6 — Cutover

**Goal**: ship the new build under the existing extension identity, migrating any user data.

**Sub-tasks**:

### 6.1 Align manifest identity

- Remove `(WXT dev)` from manifest name.
- Set `manifest.key` in `wxt.config.ts` to match the old extension's key (so the new build inherits the same Chrome extension ID and same `chrome.storage` namespace).

### 6.2 Storage migration shim

- In `entrypoints/background.ts`, on `chrome.runtime.onInstalled` with `reason === 'update'`:
    - read every old storage key
    - transform shapes if any changed during migration (Phase 3 may have introduced cleaner schemas)
    - write new shapes
    - log migration outcome
    - idempotent: running twice must not corrupt data
- Test on a fresh profile seeded with old-shape storage before going further.

### 6.3 Final smoke test

- Clean Chrome profile.
- Load the production build (`pnpm build`).
- Walk through the parity checklist one more time.

### 6.4 Build artifacts and distribution

- `pnpm zip` for Chrome Web Store.
- `pnpm zip -b firefox` if the user wants Firefox parity.
- Update `update.xml` if self-hosted updates are still in use.

### 6.5 Archive old repo

- Tag the old repo with the final shipped version (`git tag pre-wxt-final`).
- README of old repo: a single line pointing to this repo.
- Don't delete the old repo for at least a month — keep as fallback if regressions surface.

**Phase 6 done when**: production zip is uploaded / installed, smoke test green, this entire `MIGRATION_PLAN.md` is empty, and the file can be deleted.
