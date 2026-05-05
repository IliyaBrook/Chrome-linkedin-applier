# Feature checklist — Easy Apply LinkedIn

70 user-visible features captured from the original v2.2 build, kept as a regression catalog.

**Status legend**:
- ✅ Implemented in new build, matches old behavior.
- ⚠️ Implemented with a known intentional divergence (annotated).
- 🔍 Implemented in code, **needs manual Chrome verification** before sign-off.

| # | Feature | Old behavior | New behavior | Status |
|---|---|---|---|---|
| 1 | Open the popup | Toolbar action opens `popup/popup/popup.html`. | Toolbar action opens generated `popup.html`. | 🔍 |
| 2 | Popup → External Apply | `chrome.tabs.create('/popup/externalApply/externalApply.html')`. | `browser.tabs.create('external-apply.html')` via `MenuButtons`. | 🔍 |
| 3 | Popup → Settings | Opens `/popup/settings/settings.html`. | Opens `settings.html`. | 🔍 |
| 4 | Popup → Apply History | Opens `/popup/applyHistory/applyHistory.html`. | Opens `apply-history.html`. | 🔍 |
| 5 | Popup → Save link off-page | `alert("Saved is only available on the LinkedIn jobs search page.")`. | Inline `text-destructive` error in popup (`SavedLinks.tsx`). | ⚠️ Inline message instead of `alert()` — quieter UX. |
| 6 | Popup → Save link on-page | Modal opens pre-filled with current URL. | shadcn Dialog opens pre-filled with current URL via `useActiveTab`. | ✅ |
| 7 | Save-link modal validation | name required + url required + name unique + url unique on add. | Same logic in `validateAndUpsert` — covered by 7 unit tests. | ✅ |
| 8 | "Show job search links" toggle | Inline accordion below the buttons. | Same — inline accordion toggled by state. | ✅ |
| 9 | Saved-link Go button | Sends `openTabAndRunScript`. | Sends `openTabAndRunScript` via typed messaging. | 🔍 |
| 10 | Saved-link Edit | Reopens modal pre-filled; rename propagates. | Same dialog, same `validateAndUpsert` logic. | ✅ |
| 11 | Saved-link Delete | Removes from `savedLinks`. | Same. | ✅ |
| 12 | "Start Auto Apply" reflects current run state | `checkAutoApplyStatus` on mount. | `useEffect` in `AutoApplyButton` sends `checkAutoApplyStatus`. | 🔍 |
| 13 | Start off jobs page → modal | `showNotOnJobSearchAlert` to content script. | Background sends `showNotOnJobSearchAlert`; content `ModalRoot` shows React `NotOnJobSearchModal`. | 🔍 |
| 14 | Start with empty defaults → modal | `showFormControlAlert`. | Background sends `showFormControlAlert`; React `FormControlModal`. | 🔍 |
| 15 | Start success → button toggles | Becomes orange "Stop Auto Apply". | Variant flips to `destructive` with `Pause` icon. | 🔍 |
| 16 | Stop run → button toggles back | Calls `hideRunningModal` on content. | `stopAutoApply` round-trip; `RunningModal` closes. | 🔍 |
| 17 | Iterate jobs (legacy + SDUI) | Full iteration loop. | `runScript` walks `getJobItems()` for both UIs (`linkedin-dom.ts`). | ✅ |
| 18 | Skip cards already showing "Applied" | `isItemAlreadyApplied` check. | Same — `isItemAlreadyApplied` in `linkedin-dom.ts`, called per item. | ✅ |
| 19 | Title Must Skip filter | First filter applied per card. | `matchesFilter` from `lib/text-filters.ts` driven by `runScript`. | ✅ |
| 20 | Title Must Contain filter | Second filter applied per card. | Same helper, second priority in `runScript`. | ✅ |
| 21 | Wait for details ≤12 s | `waitForJobDetailsLoaded`. | `waitForJobDetailsLoaded(12_000, expectedJobId)` in `linkedin-dom.ts`. | ✅ |
| 22 | Bad-word filter on description | `\b<word>\b` regex. | Same regex check inside `clickJob` (`run-script.ts`). | ✅ |
| 23 | External apply path | Save to `externalApplyData`. | Content sends `externalApplyAction`; background dedupes via `dedupeExternalApply`. | ✅ |
| 24 | No apply control → record `noEasyApply` | History entry. | `recordApplyHistoryEntry({ reason: 'noEasyApply' })` from `runFindEasyApply`. | ✅ |
| 25 | Easy Apply form walk | Full form-fill engine. | `runValidations` orchestrates input/checkbox/radio/dropdown/city checks (`form-fillers.ts`). | ✅ |
| 26 | Unknown text placeholder → `inputFieldConfigs[++count]` | Sent via `updateInputFieldConfigsInStorage`. | `performInputFieldChecks` sends `updateInputFieldConfigsInStorage`; background bumps count. | ✅ |
| 27 | Unknown radio question → `radioButtons[]` (first option preselected) | Stored. | `performRadioButtonChecks` writes a new entry with `defaultValue = firstRadio.value`. | ✅ |
| 28 | Unknown dropdown → `dropdowns[]` (option[1] preselected) | Stored. | `performDropdownChecks` selects index 1 and writes the entry. | ✅ |
| 29 | Walk Continue → Next → Review → Submit | Recursive `runApplyModel`. | `runApplyModelLogic` recursion in `run-script.ts`, wrapped in 60 s timeout. | ✅ |
| 30 | Uncheck "Follow company" before Submit | `uncheckFollowCompany`. | Same — `uncheckFollowCompany` in `form-fillers.ts`, hits both legacy and SDUI shadow root. | ✅ |
| 31 | Wait for "application sent" modal | 8 s timeout; record outcome. | `waitForApplicationSentModal(8000)` drives `applyOutcome.sentModalDetected`. | ✅ |
| 32 | Dismiss success modal | `closeApplicationSentModal`. | Same — `closeApplicationSentModal(state)` in `modals.ts`. | ✅ |
| 33 | Auto-handle "Save this application?" alert | `handleSaveApplicationModal` w/ failure cap. | Same logic in `save-modal.ts`; failure cap stops script after 5 attempts or 30 s. | ✅ |
| 34 | 2 s save-modal poll | `startSaveModalMonitoring`. | Same interval, started by `state.startExtensionContextMonitoring`. | ✅ |
| 35 | 10 s extension-context heartbeat | `startExtensionContextMonitoring`. | Same interval; 3 consecutive losses → `stopScript`. | ✅ |
| 36 | Pagination | `goToNextPage`. | `goToNextPage(state)` in `run-script.ts` reads `getPaginationInfo()` for both UIs. | ✅ |
| 37 | Daily-limit detection | `checkLimitReached` + blinking border. | Same — `checkLimitReached` in `run-script.ts`; `toggleBlinkingBorder` flashes red. | ✅ |
| 38 | Selected CV → match attachment by name | `selectCvFile`. | `selectCvFile` in `form-fillers.ts` with name-substring fallback. | ✅ |
| 39 | Smart Select CV (`findBestMatch`) | Token + Jaro + bigram weighted blend. | `selectCvFile` calls `findBestMatch` with `exactMatchData` from `selectedCvFileFilters` when filters exist. | ✅ |
| 40 | Filter Settings — bad-words section | Toggle + add/edit/delete. | `WordListEditor` reused; storage round-trip via `useStorage`. | 🔍 |
| 41 | Filter Settings — Title Must Contain | Same shape. | Same component. | 🔍 |
| 42 | Filter Settings — Title Must Skip | Same shape. | Same component. | 🔍 |
| 43 | Duplicate add → alert | `alert("Oops!…")`. | Inline `text-destructive` error from `dedupeAdd` (covered by 4 tests). | ⚠️ Inline error message instead of `alert()`. |
| 44 | Form Control — personal info status banner | Red "Please fill…" / Green "ready". | `DefaultFieldsForm` toggles `text-destructive` / `text-emerald-700` based on `isComplete`. | 🔍 |
| 45 | Empty-field highlight | `.input-error` class. | `border-destructive` Tailwind class. | ✅ Equivalent visual. |
| 46 | First/Last name + Phone mirroring into `inputFieldConfigs` | Background `updateInputFieldValue`. | Same — `MIRRORED_FIELDS` map in `DefaultFieldsForm` triggers `sendMessage('updateInputFieldValue')`. | 🔍 |
| 47 | Text Fields list — sort by createdAt desc, then count desc | Pre-sorted in JS. | `sortConfigs` helper in `InputFieldConfigList`. | ✅ |
| 48 | Radio entries — option label = value unless numeric, then text | Special-cased. | `optionLabel(value, text)` helper in `RadioButtonConfigList`. | ✅ |
| 49 | Dropdown entries — `<select>` editing | Updates on change. | shadcn `<Select>` with `updateDropdownConfig` round-trip. | ✅ |
| 50 | Form Control live update | `chrome.storage.onChanged`. | `useStorage` hook subscribes via `item.watch()`. | 🔍 |
| 51 | External Apply list rendering | Card per entry. | shadcn `<Card>`-based list in `external-apply/App.tsx`. | ✅ |
| 52 | External Apply bulk actions | REMOVE ALL / Remove duplicates / Open all. | Same three buttons; `dedupeByLink` helper. | ✅ |
| 53 | External Apply counter | Header text. | `description={\`Total saved: ${list.length}\`}`. | ✅ |
| 54 | CV Manager — CV list with Manage / Select / Edit / Delete + selected highlight | Full UI. | Two-column layout in `cv-manager/App.tsx`; selected gets `border-primary bg-primary/5`. | ✅ |
| 55 | CV Manager — Smart Select toggle | Header switch. | shadcn `<Switch>` in PageLayout actions slot. | ✅ |
| 56 | Add CV modal | Non-empty + unique name; `cv_${Date.now()}_${rand}` id. | `addCv` helper covered by 3 unit tests. | ✅ |
| 57 | Edit CV — rename propagates filters | Rewrite `selectedCvFileFilters` key. | `renameCv` helper migrates the filters key (3 tests). | ✅ |
| 58 | Delete CV — re-selects first remaining (or null), strips filters | Cascading update. | `deleteCv` helper (3 tests). | ✅ |
| 59 | CV Manager — Manage opens right-hand panel | `data-managing` attribute. | `activeId` state in `App.tsx` controls the right panel. | ✅ |
| 60 | Per-CV Add / Edit / Delete Filter | With confirm on delete. | shadcn Dialog + `addFilter`/`updateFilter`/`deleteFilter` helpers (4 tests). | ⚠️ Delete is one-click (no confirm dialog) — quieter UX. |
| 61 | Settings page — 4 cards | Form Control, Filter Settings, CV Files, Data Management. | Same 4 cards in `settings/App.tsx`. | ✅ |
| 62 | Export settings file | `autoapply_settings_${dd}_${mm}_[${HH}_${MM}].json`. | Same filename via `exportFilename` helper. | ✅ |
| 63 | Import settings | `.json` file picker → `storage.local.set` → alert "Settings imported successfully!". | Same — inline status text instead of `alert()`. | ⚠️ Inline status. |
| 64 | Apply History — table with stats / filters / search | Full UI. | `apply-history/App.tsx` with stats pills + status/reason/search filters. Pure helpers in `filtering.ts` (14 tests). | ✅ |
| 65 | Apply History — per-row delete + Clear all (confirm) + Export CSV (respects filters) | Three actions. | Same three actions; CSV format covered by `toCsv` test. | ✅ |
| 66 | Apply History — live refresh | `chrome.storage.onChanged`. | `useStorage` hook subscribes via `item.watch()`. | 🔍 |
| 67 | Apply History — colour-coded reason / YES-NO badge | Tailwind-style badges. | Inline emerald/amber/red badges. | ✅ |
| 68 | In-page Running Modal | Static HTML modal. | `RunningModal` React component, shadow-root mounted. | 🔍 |
| 69 | In-page Not-on-jobs modal | Static HTML modal with Go-to-search. | `NotOnJobSearchModal` React; "Go to job search" navigates to `LINKEDIN_JOBS_URL`. | 🔍 |
| 70 | In-page Form-Control modal | Static HTML modal. | `FormControlModal` React; "Open Form Control" sends `openDefaultInputPage`. | 🔍 |

## How to use

1. Walk every row in Chrome side-by-side with the old extension loaded.
2. Switch a 🔍 to ✅ once you've manually confirmed.
3. ⚠️ rows are intentional divergences — confirm they're acceptable, then leave the annotation.

## Storage seed

Use `scripts/seed-storage.ts` (paste into the DevTools service-worker console of either build) to populate a known-good storage state for reproducible runs.
