# Migration plan — Easy Apply LinkedIn → WXT + React + Tailwind

This file is the **active TODO list**. As phases and sub-tasks land, the corresponding sections are **deleted from this file** (not ticked, not crossed out). The file shrinks until empty — that's how you know migration is done.

Always work the **first uncompleted sub-task** in the **earliest remaining phase**. Don't jump phases.

> Reference: `CLAUDE.md` for conventions, `.claude/rules/` for detailed rules, `MIGRATION_AUDIT.md` (produced in Phase 1) for behavioral spec.

---

## Phase 3 — Infrastructure layer

**Goal**: typed wrappers and shared types in place before any UI work begins.

**Sub-tasks**:

### 3.1 `lib/types.ts`

- Port all types implied by the storage schema and message contracts in `MIGRATION_AUDIT.md` (sections 4 and 5).
- One file, named exports, no `any`.

### 3.2 `lib/storage.ts`

- For each storage key in audit section 4: one `storage.defineItem(...)` declaration with key constant, type, fallback.
- Re-export keys as `SCREAMING_SNAKE_CASE` constants.
- Add a `useStorage` hook in `hooks/useStorage.ts` if not provided directly by `wxt/storage`.

### 3.3 `lib/messaging.ts`

- `pnpm add @webext-core/messaging`
- Build `ProtocolMap` interface from audit section 5.
- Export `sendMessage`, `onMessage`.

### 3.4 `entrypoints/background.ts`

- Port background.js logic from old project to `defineBackground(() => { ... })`.
- No top-level mutable state — all state via `lib/storage.ts` + `chrome.alarms`.
- Wire all message handlers through `onMessage` from `lib/messaging.ts`.

### 3.5 Install shadcn primitives

- Run `pnpm dlx shadcn@latest add` for each component the audit's UI implies (typically: `button`, `input`, `label`, `select`, `tabs`, `dialog`, `switch`, `checkbox`, `tooltip`, `scroll-area`, `separator`, `card`).
- Don't add primitives we don't have a use for yet — add lazily as Phase 4 needs them.

**Phase 3 done when**: all sub-tasks above are deleted, extension still loads, background logs show on install, one storage round-trip works (write from popup, read in background).

---

## Phase 4 — Per-entrypoint UI migration

**Goal**: rewrite each user-facing surface in React + Tailwind + shadcn, one at a time. After each surface lands, manually verify against the old extension and delete the sub-task.

**Sub-tasks** (order may shift based on audit findings; default order):

### 4.1 Popup — primary action panel

- `entrypoints/popup/`
- Replicate the old `popup/popup/popup.html` structure with shadcn components.
- All state via `useStorage` hooks. No DOM manipulation.
- Verify: every button, toggle, and input from the old popup is reachable; storage round-trips match the old shape.

### 4.2 Popup — Filter Settings tab/page

- Replicate `popup/filterSettings/filterSettings.html`.
- Tabs via `Tabs` shadcn component, or a route within the popup if the old version was a separate page.
- Verify side-by-side.

### 4.3 Popup — Form Control tab/page

- Replicate `popup/formControl/formControl.html`.
- Verify side-by-side.

### 4.4 Popup — External Apply tab/page

- Replicate `popup/externalApply/externalApply.html`.
- Verify side-by-side.

### 4.5 Options page (if audit identifies one)

- `entrypoints/options/`
- Same approach as popup.

### 4.6 Modals injected into LinkedIn pages

- Old project has `modals/{formControlModal,notOnJobSearchModal,runningModal}.html`.
- Port to React UIs mounted via `createShadowRootUi()` inside a content script, with `cssInjectionMode: 'ui'` so Tailwind stays scoped.
- Verify on a real LinkedIn jobs page.

### 4.7 Content scripts — automation logic

- Port `content/{utils,createElements,content,xpaths}.js` to typed TS modules under `entrypoints/<name>.content.ts`.
- Keep XPaths in a single `lib/xpaths.ts` constant table — easy to update when LinkedIn changes its DOM.
- Verify: full apply-flow runs end-to-end on a test LinkedIn account.

### 4.8 Localization

- If old project has `_locales/`, port to `public/_locales/` or migrate to `@wxt-dev/i18n`.

**Phase 4 done when**: all sub-tasks above are deleted and every feature in audit section 8 has a working counterpart in the new build.

---

## Phase 5 — Parity tests

**Goal**: methodically prove the new extension behaves identically to the old one before cutover.

**Sub-tasks**:

### 5.1 Build `tests/PARITY_CHECKLIST.md`

- One row per feature from audit section 8.
- Columns: Feature | Old behavior (brief) | New behavior (brief) | Status (✅/❌/⚠️ with note).
- Initial pass: fill in old behavior column from audit + a manual run of the old extension.

### 5.2 Manual side-by-side run

- Both extensions loaded in same Chrome profile.
- Walk every row of the checklist.
- Note divergences. Each ❌/⚠️ either gets a fix in the new code (loop back to Phase 4) or a documented intentional divergence (with user sign-off).

### 5.3 Storage seed script

- `scripts/seed-storage.ts` — pasteable into DevTools Console, sets a known-good test state for both extensions so parity comparisons are reproducible.

### 5.4 Permissions diff

- Side-by-side `manifest.json` of old vs `wxt build`'s generated manifest.
- New manifest must not request a permission the old one didn't, unless explicitly justified to user.

**Phase 5 done when**: every checklist row is ✅ or has user-signed-off divergence note, and the user gives go-ahead for cutover.

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
