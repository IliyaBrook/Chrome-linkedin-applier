# Migration plan — Easy Apply LinkedIn → WXT + React + Tailwind

This file is the **active TODO list**. As phases and sub-tasks land, the corresponding sections are **deleted from this file** (not ticked, not crossed out). The file shrinks until empty — that's how you know migration is done.

Always work the **first uncompleted sub-task** in the **earliest remaining phase**. Don't jump phases.

> Reference: `CLAUDE.md` for conventions, `.claude/rules/` for detailed rules, `MIGRATION_AUDIT.md` (produced in Phase 1) for behavioral spec.

---

## Phase 4.7 — Content-script automation port (remaining)

**Pure helpers landed**: `lib/{fuzzy-match,text-filters,linkedin-urls,time-format,apply-history,xpaths,constants}.ts` are ported and unit-tested. The runtime stub in `entrypoints/linkedin.content/` mounts the modals + registers message handlers, but the actual LinkedIn DOM automation is NOT yet ported.

**What still needs to land** (full inventory in [`PHASE_4_7_PLAN.md`](PHASE_4_7_PLAN.md) sections B, C, D):

- `entrypoints/linkedin.content/dom-utils.ts` — `addDelay`, `getVisibleElementByXPath`, `getElementsByXPath`, `isElementVisible`, `waitForElements`, `clickElement`, `setNativeValue`, `fillAutocompleteField`, `aaLog/aaWarn/aaError`.
- `entrypoints/linkedin.content/linkedin-dom.ts` — `detectJobsUI`, `isJobsSearchPage`, `getNewUiJobsListColumn`, `getJobItems`, `getDismissButtonForItem`, `extractJobTitleFromItem`, `getJobItemClickTarget`, `extractCompanyNameFromItem`, `isItemAlreadyApplied`, `getJobIdFromItem`, `findJobItemByJobId`, `getJobsListScrollContainer`, `getPaginationInfo`, `waitForJobItems`, `waitForJobDetailsLoaded`, `getJobTitle`.
- `entrypoints/linkedin.content/modals.ts` — `findEasyApplyModal`, `findSduiApplyModal`, `getInteropShadowRoot`, `dismissSduiApplyModal`, `findApplicationSentModal`, `waitForApplicationSentModal`, `handleDiscardConfirmDialog`, `ensureNoApplicationModalOpen`, `closeApplicationSentModal`, `validateAndCloseConfirmationModal`, `performSafetyReminderCheck`, `clickDoneIfExist`, `terminateJobModel`.
- `entrypoints/linkedin.content/loaders.ts` — `waitForLoaderToDisappear`, `waitForJobsLoaderToDisappear`, `waitForJobsLoaderToDisappearAndHandle`, `toggleBlinkingBorder`.
- `entrypoints/linkedin.content/save-modal.ts` — `handleSaveApplicationModal` plus its `start/stopSaveModalMonitoring` interval pair.
- `entrypoints/linkedin.content/form-fillers.ts` — `handleCheckboxField`, `performInputFieldChecks`, `performFillForm`, `performRadioButtonChecks`, `performDropdownChecks`, `performCheckBoxFieldCityCheck`, `performUniversalCheckboxChecks`, `runValidations`, `uncheckFollowCompany`, `selectCvFile`, `checkForFormValidationError`.
- `entrypoints/linkedin.content/run-state.ts` — `ContentRunState` (bundle the 14 module-scope `let`s from old content.js into a closure-scoped record), `setAutoApplyRunning`, `checkAndPrepareRunState`, `updateScriptActivity`, `startScript`, `stopScript`, `startExtensionContextMonitoring`, `stopExtensionContextMonitoring`, `isExtensionContextValid(Quiet)`.
- `entrypoints/linkedin.content/run-script.ts` — the main `runScript` / `runFindEasyApply` / `runApplyModel(Logic)` / `clickJob` / `goToNextPage` / `resetApplyOutcome` / `fillSearchFieldIfEmpty` / `checkAndPromptFields` / `checkLimitReached` flow.
- Replace the placeholder `window.runScript = () => { ... }` in `entrypoints/linkedin.content/index.tsx` with a call into `run-script.ts`.

**Verification**: end-to-end apply flow runs on a real LinkedIn jobs page. Cannot be done without LinkedIn access — tracked here so it doesn't get lost.

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
