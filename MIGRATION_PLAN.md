# Migration plan — Easy Apply LinkedIn → WXT + React + Tailwind

This file is the **active TODO list**. As phases and sub-tasks land, the corresponding sections are **deleted from this file** (not ticked, not crossed out). The file shrinks until empty — that's how you know migration is done.

Always work the **first uncompleted sub-task** in the **earliest remaining phase**. Don't jump phases.

> Reference: `CLAUDE.md` for conventions, `.claude/rules/` for detailed rules, `MIGRATION_AUDIT.md` (produced in Phase 1) for behavioral spec.

---

## Phase 5 — Parity tests (manual run remaining)

Code deliverables landed:
- [`tests/PARITY_CHECKLIST.md`](tests/PARITY_CHECKLIST.md) — 70 rows from audit § 8 with old/new behavior side-by-side.
- [`tests/MANIFEST_DIFF.md`](tests/MANIFEST_DIFF.md) — old vs `pnpm build` manifest comparison; no new permissions.
- [`scripts/seed-storage.ts`](scripts/seed-storage.ts) — pasteable seed for reproducible parity runs.

Still TODO:
- **Phase 5.2 manual run.** Walk each remaining 🔍 row in the checklist (popup wiring, settings UI, in-page modal triggers — content-script automation rows already flipped to ✅ after Phase 4.7 verification), flip to ✅ as confirmed.

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

**Phase 6 done when**: production zip is uploaded / installed, smoke test green, this entire `MIGRATION_PLAN.md` is empty, and the file can be deleted.
