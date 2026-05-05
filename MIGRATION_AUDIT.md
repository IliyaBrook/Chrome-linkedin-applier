# Migration audit — Easy Apply LinkedIn (v2.2)

Source: `D:\codding\My_projects\ChromeExtentions\autoApplylinkedin` (read-only).
Audit date: 2026-05-05.

---

## 1. Manifest inventory

| Field | Value | Notes |
|---|---|---|
| `manifest_version` | `3` | MV3 service worker model. |
| `name` | `Easy Apply LinkedIn` | New build must add `(WXT dev)` suffix until cutover. |
| `version` | `2.2` | New build starts fresh; bump independently. |
| `description` | `Applying for Jobs Made Effortless!` | Carry over verbatim. |
| `icons` | 16/48/128 → `assets/images/256256.png` (single 256×256 png) | Single-source-image strategy; only one PNG file actually exists. WXT can be pointed at the same file or we can re-export proper sizes. |
| `action.default_icon` | Same as `icons` (16/48/128 → `assets/images/256256.png`) | — |
| `action.default_popup` | `popup/popup/popup.html` | Action popup. |
| `action.default_title` | `CONFIGURATION` | Tooltip text. |
| `background.service_worker` | `background.js` | — |
| `background.type` | `module` | `defineBackground(() => { ... })` in WXT. |
| `content_scripts[0].matches` | `["<all_urls>"]` | All pages. New build can narrow to LinkedIn — see §9 risks. |
| `content_scripts[0].js` | `["content/utils.js", "content/createElements.js", "content/content.js", "content/xpaths.js"]` | Order matters: utils + xpaths define globals, content.js + createElements.js consume them. Note manifest order is `utils, createElements, content, xpaths` but content.js depends on `easy_apply_button` from xpaths (relies on hoisting / runtime resolution). |
| `content_scripts[0].run_at` | `document_idle` | — |
| `permissions` | `["tabs", "storage", "activeTab", "scripting"]` | All four are actually used. |
| `host_permissions` | `["<all_urls>"]` | Required because the script runs on all URLs and uses `<all_urls>` matches. New build can scope to `https://*.linkedin.com/*` if we narrow content scripts. |
| `web_accessible_resources` | `popup/**`, `assets/images/*`, `assets/**`, `modals/*.html`, `modals/*.css`, `modals/*.js`, `modals/*` for `<all_urls>` matches | Old code injects modals into LinkedIn pages by `fetch(chrome.runtime.getURL(...))`-ing the HTML files. The new WXT build will use `createShadowRootUi()` and won't need WAR for these. |

Manifest fields NOT present (and not needed): `commands`, `omnibox`, `default_locale` / `_locales`, `options_page`, `chrome_url_overrides`, `devtools_page`, `key`. Storage area `sync` is NOT used anywhere — only `chrome.storage.local`.

---

## 2. Entrypoints map

### 2.1 Popup (action)

- **HTML**: `popup/popup/popup.html`
- **JS**: `popup/popup/popup.js`
- **CSS**: `popup/popup/popup.css`, `popup/global.css`
- Also pulls in `content/utils.js` via `<script>` to get `getTime()` (used by export filename in Settings, but Settings imports it itself; popup loads it for parity).

What it shows:
- Top grid (2-column): `External Apply` button (cyan), `Settings` button (slate). Below them, full-width `Apply History` button (purple).
- Row of two indigo buttons: `Save job search link`, `Show job search links` (toggles inline accordion below it that lists saved links with Go / Edit / Delete icon buttons).
- Big green centred `Start Auto Apply` button. Toggles to orange "Stop Auto Apply" with a different icon while a run is active.
- Modal overlay (initially hidden) for adding/editing a saved job-search link with `Link name` + `Job search URL` text inputs and Save/Cancel buttons.

Behaviours / message round-trips:
- On `DOMContentLoaded` it queries the active tab, sends `checkAutoApplyStatus` to background, sets the button to running/stopped state accordingly. Also writes `autoApplyRunning` to storage so popup is consistent.
- `Start Auto Apply` button reads `autoApplyRunning` from storage, flips state, sends `startAutoApply` or `stopAutoApply` (with `tabId`) to background.
- `Save job search link` first calls `getCurrentUrl` on the active tab (sends `getCurrentUrl` content-script message), validates URL contains `linkedin.com/jobs`, then opens the modal pre-filled with the URL.
- Save in modal validates name+url uniqueness, writes to `savedLinks`.
- `Show job search links` toggles a runtime-built `<div id="linksAccordion">` listing entries from `savedLinks`. Each entry has Go (sends `openTabAndRunScript` to background), Edit (re-opens modal), Delete (rewrites `savedLinks`).
- `External Apply` / `Settings` / `Apply History` buttons each `chrome.tabs.create` the corresponding sub-page HTML.

### 2.2 Sub-pages opened in new tabs

#### 2.2.1 `popup/filterSettings/`
- Files: `filterSettings.html`, `filterSettings.js`, `filterSettings.css`
- Opened by: Settings page → "Filter Settings" card button (`chrome.tabs.create` → `/popup/filterSettings/filterSettings.html`).
- User sees: Three columns side-by-side, each with header + inline toggle switch + list of words + add input + Add button:
  1. **About the job bad words** (toggle = `badWordsEnabled`). List `badWords[]`. When enabled, scanned against job description full text using `\b<word>\b` regex (word-boundary).
  2. **Job Title Must Contain** (toggle = `titleFilterEnabled`). List `titleFilterWords[]`. When enabled, job title (or company name) must contain at least one to be processed.
  3. **Job Title Must Skip** (toggle = `titleSkipEnabled`). List `titleSkipWords[]`. Highest priority — match means skip.
- Each list item has an inline `<input>` (editable in place — change saves to storage on `change` event) and a Delete button.
- Adding a duplicate (case-insensitive) shows `alert("Oops! This word is already in your filter. Try adding a new one!")`.
- Reads/writes: `badWordsEnabled`, `titleFilterEnabled`, `titleSkipEnabled` (defaults to `true` if unset), `badWords`, `titleFilterWords`, `titleSkipWords`.

#### 2.2.2 `popup/formControl/`
- Files: `formControl.html`, `formControl.js`, `formControl.css`
- Opened by: Settings page → "Form Control" card button → `chrome.tabs.create` → `/popup/formControl/formControl.html`. Also by background when content script reports `openDefaultInputPage` (default fields incomplete).
- User sees: Four columns side-by-side:
  1. **Required Personal Info** — header + status message ("Please fill out the missing values:" red, or "You are ready to use auto apply!" green), then label/input pairs for `YearsOfExperience`, `FirstName`, `LastName`, `PhoneNumber`, `City`, `Email`. Pristine empties get `.input-error` class. Edits persist to `defaultFields[fieldName]` on `change`.
  2. **Text Fields Entry** — list of `inputFieldConfigs[]` (sorted by `createdAt` desc, then `count` desc). Each card shows: placeholder (`<h3>`), `Current Value`, `Counter`, an editable input pre-filled with the default value, Update + Delete buttons. Update sends `updateInputFieldValue` to background; Delete sends `deleteInputFieldConfig`. Live-updates via `chrome.storage.onChanged`.
  3. **Radio Buttons Entry** — list of `radioButtons[]`. Each card shows placeholder text, counter, then radio inputs for each option. Selecting a radio sends `updateRadioButtonValueByPlaceholder` to background. Delete button sends `deleteRadioButtonConfig`. Note: the legacy code uses `option.value` as the visible label unless the value is purely numeric, in which case it uses `option.text`.
  4. **Dropdowns Entry** — list of `dropdowns[]`. Each card shows placeholder, counter, then a `<select>` of options. Change sends `updateDropdownConfig` (with placeholderIncludes, options array, value). Delete sends `deleteDropdownConfig` and removes the row immediately.
- Side-effect on first load: if `defaultFields` is missing/empty, write `defaultNullFieldInput` (the six-key blank object) to storage.
- Special behaviour: when user fills `FirstName` → also mirrors the value into `inputFieldConfigs` under `placeholderIncludes: 'First name'`. Same for `LastName` → `'Last name'`, `PhoneNumber` → `'Mobile phone number'`. Values are written via background `updateInputFieldValue`.

#### 2.2.3 `popup/externalApply/`
- Files: `externalApply.html`, `externalApply.js`, `externalApply.css`
- Opened by: Popup → "External Apply" button → `chrome.tabs.create` → `/popup/externalApply/externalApply.html`.
- User sees: Heading "Saved external apply job links", counter "Total links: N", three header buttons (REMOVE ALL — red, Remove duplicate links — orange, Open all links — blue). Below: a list of cards. Each card shows Company / Date stamp on top row, Job title bold below, then the URL as a clickable `<a>`, then a red Delete button at right.
- Reads/writes: `externalApplyData[]` only.
- "Remove duplicates" keeps only the first occurrence of each `link`. "Open all links" `window.open(link, '_blank')` for every entry. Delete removes one entry by `link`.

#### 2.2.4 `popup/cvManager/`
- Files: `cvManager.html`, `cvManager.js`, `cvManager.css`
- Opened by: Settings page → "CV Files" card → `chrome.tabs.create` → `chrome.runtime.getURL("popup/cvManager/cvManager.html")`.
- User sees: Header "CV Files Manager" + a toggle "Smart Select CV" (right side). Two-column main:
  - Left column: list of CV files with name + filter-count badge + four buttons per row (Manage, Select, Edit, Delete). Add button + modal at top of column. Selected entry has a gradient background (the `.selected` class).
  - Right column (hidden until a CV is "Manage"d): list of job-title filters for the active CV, with Add + Edit + Delete buttons per row, plus an Add Filter modal.
- Modals: Add CV, Edit CV, Add Filter, Edit Filter — each is a centered overlay with a single text input + Save/Cancel.
- Storage shape:
  - `cvFiles`: `Array<{ id: string; name: string }>` — `id` is generated as `cv_${Date.now()}_${rand}`.
  - `selectedCvFile`: `string | null` — points to a `cvFiles[i].id`.
  - `selectedCvFileFilters`: `Record<cvFileName, string[]>` — keyed by filename (NOT by id — renaming the CV migrates the entry).
  - `smartSelectEnabled`: `boolean`.
- Behaviour quirks: deleting the currently-selected CV auto-selects `cvFiles[0]` if any remain, else sets to `null`. Renaming a CV propagates to the `selectedCvFileFilters` key. The CV row uses the `name` field to match attachments in LinkedIn modals (case-insensitive `includes`).

#### 2.2.5 `popup/settings/`
- Files: `settings.html`, `settings.js`, `settings.css`
- Opened by: Popup → "Settings" button → `chrome.tabs.create` → `/popup/settings/settings.html`.
- User sees: Header "Settings — Configure your AutoApply extension". Then a 4-card grid:
  1. **Form Control** — opens `popup/formControl/formControl.html`.
  2. **Filter Settings** — opens `popup/filterSettings/filterSettings.html`.
  3. **CV Files** — opens `popup/cvManager/cvManager.html`.
  4. **Data Management** — Export and Import buttons.
- Export: `chrome.storage.local.get(null, ...)` → JSON.stringify → `Blob` → triggers download `autoapply_settings_${dd}_${mm}_[${HH}_${MM}].json` (uses `getTime()` from `content/utils.js`).
- Import: file picker accepts `.json`, parses, `chrome.storage.local.set(importedData)`. On success an `alert("Settings imported successfully!")`.

#### 2.2.6 `popup/applyHistory/`
- Files: `applyHistory.html`, `applyHistory.js`, `applyHistory.css`
- Opened by: Popup → "Apply History" button → `chrome.tabs.create` → `/popup/applyHistory/applyHistory.html`.
- User sees: Header "Apply History" + four stat pills (total, applied — green, skipped — amber, errors — red).
- Controls bar: status filter (All / Applied only / Not applied only / Errors only), reason filter (auto-populated from existing entries — labels mapped via `REASON_LABELS`), search input (matches title / company / description / reason label, case-insensitive). Right side: Export CSV, Clear all (with confirm overlay).
- Table columns: Time (dd/MM HH:mm), Title (bold), Company, Applied (YES/NO badge), Reason (pill — only when not applied), Description (only when not applied), URL (link to LinkedIn job view), per-row × delete button.
- Reads `applyHistory` from storage; subscribes to `chrome.storage.onChanged` and reloads on changes.
- Reason labels mapping (must be re-implemented exactly):
  - `applied` → "Applied"
  - `alreadyApplied` → "Already applied"
  - `external` → "External apply"
  - `noEasyApply` → "No Easy Apply"
  - `sduiNotSupported` → "SDUI not supported"
  - `titleSkip` → "Title Must Skip"
  - `titleFilterMissing` → "Title Must Contain"
  - `badWord` → "Bad word in description"
  - `noTitle` → "No title"
  - `noClickTarget` → "No click target"
  - `clickFailed` → "Click failed"
  - `detailsNotLoaded` → "Details did not load"
  - `limitReached` → "Daily limit reached"
  - `error` → "Error"
  - `other` → "Other"
- Reason values that can also appear (defined in `content/utils.js` `AA_REASONS`) but missing from the popup's `REASON_LABELS`:
  - `submitNotConfirmed` (`'Submit not confirmed'` would be the reasonable label; old popup falls back to raw key string).
  - `noSubmitButton` (same).
- "Clear all" wipes `applyHistory` to `[]` after a confirm modal. Per-row × removes a single entry by `(timestamp, jobId)` tuple.
- Export CSV applies the current filters and writes a file named `apply-history-${YYYY-MM-DD}.csv` with columns Time, Title, Company, Applied, Reason, Description, URL.

### 2.3 Background service worker

- File: `background.js`
- Runtime model: ES module service worker (manifest `background.type=module`).
- Top-level state: `let currentInputFieldConfigs = []` — kept warm but not really persisted (every handler reads/writes storage directly, this var is just a memo). For the new build this can disappear entirely.
- Two `chrome.runtime.onMessage.addListener(...)` registrations exist: the main one (handles ~14 actions) and a tiny duplicate (lines 390–395) that re-handles `deleteInputFieldConfig`. The duplicate is dead code — the main listener already handles it. Note as a quirk in §9.

Message handlers (background-side):

| Action | Behaviour | sendResponse shape |
|---|---|---|
| `externalApplyAction` | Receives `{ jobTitle, currentPageLink, companyName }`, pushes to `externalApplyData`, dedupes by `link` AND by `(title, companyName)`, sorts desc by `time`, writes back. | `{ success: true }` or `{ success:false, error }` |
| `openDefaultInputPage` | `chrome.tabs.create({ url: "popup/formControl/formControl.html" })` | (no response expected) |
| `startAutoApply` | Validates active tab is on `linkedin.com/jobs`. Reads `defaultFields`. If missing → `showFormControlAlert` to content script. If wrong page → `showNotOnJobSearchAlert`. Else `chrome.scripting.executeScript({ func: runScriptInContent })` on the tab. `runScriptInContent` calls global `runScript()` which already exists from the persistent content script. | `{ success: true }` or `{ success:false, message }` |
| `stopAutoApply` | Sets `autoApplyRunning=false`, sends `hideRunningModal` to content script of active tab. | `{ success: bool, message? }` |
| `openTabAndRunScript` | `chrome.tabs.create({ url })`, on `tabs.onUpdated` `complete` sends `showRunningModal`, then `chrome.scripting.executeScript` to fire `runScriptInContent` (which calls `runScript()` in content). | `{ success, message? }` |
| `updateInputFieldValue` | Upserts `inputFieldConfigs[i]` by `placeholderIncludes`. New entries default `count: 1`. Does NOT set `createdAt`. | `{ success: true }` / `{ success:false, message }` |
| `updateInputFieldConfigsInStorage` | Increments the `count` for existing entries; otherwise creates a new entry with `count: 1` and `createdAt: Date.now()`. Background-side memo `currentInputFieldConfigs` is kept in sync. | `{ success: true }` |
| `deleteInputFieldConfig` | Removes from `inputFieldConfigs`. | (none) |
| `getInputFieldConfig` | Returns full `inputFieldConfigs` array (or `null`). | `inputFieldConfigs[]` (NOT wrapped in success envelope) |
| `updateRadioButtonValueByPlaceholder` | Mutates `radioButtons[i].defaultValue` and the `selected` flag on each option. | (none) |
| `deleteRadioButtonConfig` | Removes by `placeholderIncludes`. | (none) |
| `updateDropdownConfig` | Upserts `dropdowns[i]`. New entries get `createdAt: Date.now()`. Each option's `selected` is reset based on the new `value`. | (none) |
| `deleteDropdownConfig` | Removes from `dropdowns`. | (none) |
| `checkAutoApplyStatus` | Sends `checkScriptRunning` to the given tab; writes the result back to `autoApplyRunning`. Falls back to reading the storage key if no `tabId`. | `{ isRunning: bool }` |

Note: `autoApplyRunning` (boolean message-action) is sent from content `startScript()` to background but background has no explicit handler for it — it falls through silently. Treat it as a no-op artifact.

### 2.4 Content scripts

Files in injection order (per manifest):

1. **`content/utils.js`** — DOM helpers (`addDelay`, `getVisibleElementByXPath`, `getElementsByXPath`, `waitForElements`, `clickElement`, `setNativeValue`, autocomplete handler `fillAutocompleteField`, fuzzy matching utilities `findClosestField` / `findBestMatch` / `levenshteinDistance` / `jaroWinkler`, LinkedIn-specific helpers `findEasyApplyModal`, `findSduiApplyModal`, `dismissSduiApplyModal`, `detectJobsUI`, `getJobItems`, `extractJobTitleFromItem`, `extractCompanyNameFromItem`, `getJobIdFromItem`, `findJobItemByJobId`, `getPaginationInfo`, `waitForJobItems`, `waitForJobDetailsLoaded`, `findApplicationSentModal`, `waitForApplicationSentModal`, modal handlers `handleDiscardConfirmDialog` / `ensureNoApplicationModalOpen`, console wrappers `aaLog/aaWarn/aaError`, history persistence `recordApplyHistoryEntry`, constants `AA_REASONS`, `AA_HISTORY_LIMIT=2000`, `AA_UI_LEGACY/NEW/UNKNOWN`).
2. **`content/createElements.js`** — On any `linkedin.com` page, async-fetches the three modal HTML files (`modals/notOnJobSearchModal.html`, `modals/formControlModal.html`, `modals/runningModal.html`) plus their CSS (`modals/modals.css`) and JS (`modals/modals.js`), and appends them to `<body>`. This is how the modals are injected without iframes.
3. **`content/content.js`** — Main automation logic. Top-level state: `autoApplyRunning` (mirrored to storage), `extensionContextCheckInterval`, `saveModalCheckInterval`, `isSaveModalBeingHandled`, `lastSaveModalHandleTime`, `saveModalDetectedTime`, `saveModalFailureCount`, plus an `__aaApplyOutcome` tracker `{ submitClicked, sentModalDetected, reachedModal }` reset before each Easy-Apply attempt. Defines `runScript`, `runFindEasyApply`, `runApplyModel(Logic)`, form-fill validators (`performInputFieldChecks`, `performRadioButtonChecks`, `performDropdownChecks`, `performCheckBoxFieldCityCheck`, `performUniversalCheckboxChecks`, `selectCvFile`, `uncheckFollowCompany`), modal handlers (`handleSaveApplicationModal`, `terminateJobModel`, `closeApplicationSentModal`, `validateAndCloseConfirmationModal`), navigation (`goToNextPage`), context monitoring (`startExtensionContextMonitoring`, `startSaveModalMonitoring`). Listens for messages: `showNotOnJobSearchAlert`, `showFormControlAlert`, `checkScriptRunning`, `getCurrentUrl`, `showSavedLinksModal`, `showRunningModal`, `hideRunningModal`. Wires `window.beforeunload` to stop monitoring.
4. **`content/xpaths.js`** — Two XPath constants (`easy_apply_button`, `not_easy_apply_button`) used by content.js to locate apply buttons across both the legacy and new SDUI LinkedIn UIs.

All four scripts share the same window scope (no IIFE / no module wrapper).

### 2.5 Modal pages

- Files: `modals/formControlModal.html`, `modals/notOnJobSearchModal.html`, `modals/runningModal.html`, `modals/modals.js`, `modals/modals.css`.
- Loaded via `content/createElements.js` running on every linkedin.com page: it `fetch`es each HTML file with `chrome.runtime.getURL(...)`, parses the markup, appends the modal element to `document.body`, also appends a `<link rel="stylesheet">` to `modals/modals.css` and a `<script type="module" src=".../modals.js">` to `body`.
- These are listed in `web_accessible_resources` so the page can `fetch` and `<script>`-load them.
- `modals/modals.js` adds a single document-level click listener that:
  - On any close-named button click, hides both `notOnJobSearchOverlay` and `formControlOverlay`.
  - On the `goToJobSearchButton` click, navigates to `https://www.linkedin.com/jobs/search`.
- The running modal (`scriptRunningOverlay`) is shown/hidden by `showRunningModal` / `hideRunningModal` messages from background, and hidden by `stopScript` in content.js. Its inner `Stop` button is `#stopScriptButton` but no click handler is wired in `modals.js` — the content script handles it via `stopScript`/storage/messages.
- Triggers:
  - `notOnJobSearchOverlay`: shown when user clicks Start in popup but the active tab is not on `linkedin.com/jobs` → background sends `showNotOnJobSearchAlert`.
  - `formControlOverlay`: shown when `defaultFields` is empty → background sends `showFormControlAlert`. Its OK button just hides the modal.
  - `scriptRunningOverlay`: shown by background `openTabAndRunScript` after the tab has loaded → sends `showRunningModal`. Hidden by background `stopAutoApply` → sends `hideRunningModal`. Also hidden by content `stopScript()`.
- Note: an additional `savedLinksOverlay` is referenced in `modals/modals.css` and in content.js (`showSavedLinksModal` handler), but no HTML file for it exists in the old project. The handler builds the list dynamically into `#savedLinksList` if the wrapper is found — in practice the popup renders saved links inline now, so this is dead code. List in §9.

---

## 3. Chrome APIs used

Grouped by surface. File:line list for each. (`*` denotes "many call sites — not exhaustively enumerated".)

### `chrome.storage.local`

| API | File:line(s) | Purpose |
|---|---|---|
| `.get` | `background.js:22, 77, 320, 360, 410, 426, 445, 481`; `content/utils.js:1311`; `content/content.js:139, 250, 467, 473, 565, 657, 1127, 1706, 1912, 2155, 2196`; `popup/popup/popup.js:80, 120, 164, 321`; `popup/formControl/formControl.js:42, 49, 191, 285, 391`; `popup/filterSettings/filterSettings.js:26, 47, 56, 65, 97, 110, 124, 142, 160`; `popup/applyHistory/applyHistory.js:223`; `popup/externalApply/externalApply.js:14, 30, 43, 129`; `popup/cvManager/cvManager.js:62, 76, 158, 197, 238, 282, 335, 371, 397`; `popup/settings/settings.js:16` (`get(null)` for full export) | Read storage. |
| `.set` | `background.js:14, 46, 163, 315, 352, 367, 381, 420, 431, 476, 488`; `content/utils.js:1315`; `content/content.js:55, 73, 647, 652, 726, 1864, 2199`; `popup/popup/popup.js:99, 105, 167, 270, 274, 315`; `popup/formControl/formControl.js:288, 394`; `popup/filterSettings/filterSettings.js:34, 38, 42, 100, 113, 127, 144, 163`; `popup/applyHistory/applyHistory.js:234, 241`; `popup/externalApply/externalApply.js:23, 57, 132`; `popup/cvManager/cvManager.js:70, 174, 220, 258, 269, 347, 383, 404`; `popup/settings/settings.js:52` (`set(importedData)`) | Write storage. |
| `.onChanged.addListener` | `popup/applyHistory/applyHistory.js:319`; `popup/formControl/formControl.js:23` | Live-refresh popup pages on cross-tab updates. |

### `chrome.runtime`

| API | File:line(s) | Purpose |
|---|---|---|
| `.sendMessage` | `content/content.js:106, 126, 341, 508, 1483 (check-only ref), 1506, 1887, 2183`; `popup/popup/popup.js:142, 263, 308`; `popup/formControl/formControl.js:56, 114, 124, 202, 211, 221, 268, 369`; `chrome.runtime.sendMessage` total ≈ 19 sites in non-background files | Cross-context RPC. |
| `.onMessage.addListener` | `background.js:52, 390`; `content/content.js:2135` | Receive messages. |
| `.getURL` | `content/createElements.js:17, 29, 39, 47`; `popup/settings/settings.js:12` | Build `chrome-extension://` URLs for fetched modal HTML and for the CV manager open URL. |
| `.id` (read) | `content/content.js:42, 2246` | Detect "extension context invalidated" state during long-running scripts. |
| `.lastError` | `background.js:173` | Tab-error fallback in `stopAutoApply`. |

### `chrome.tabs`

| API | File:line(s) | Purpose |
|---|---|---|
| `.query({ active: true, currentWindow: true })` | `content/content.js:103`; `popup/popup/popup.js:21, 256, 305`; `background.js:69, 165` | Find active tab. |
| `.create({ url })` | `popup/popup/popup.js:186, 189, 192`; `popup/settings/settings.js:4, 8, 12`; `background.js:65, 223` | Open new tabs (sub-pages, savedLinks). |
| `.sendMessage` | `popup/popup/popup.js:23`; `background.js:91, 116, 190, 226, 242, 303` | Send to content scripts. |
| `.get(tabId)` | `background.js:172` | Re-fetch tab to confirm URL on stop. |
| `.onUpdated.addListener` (one-shot) | `background.js:224` | After opening saved-link tab, wait for `complete` then inject. |

### `chrome.scripting`

| API | File:line(s) | Purpose |
|---|---|---|
| `.executeScript({ target, func })` | `background.js:140, 230` | Run `runScriptInContent()` (which calls global `runScript()`) inside the active tab after Start / openTab. |

No usage of: `chrome.alarms`, `chrome.notifications`, `chrome.commands`, `chrome.contextMenus`, `chrome.cookies`, `chrome.declarativeNetRequest`, `chrome.identity`, `chrome.i18n`, `chrome.permissions`, `chrome.storage.sync`, `chrome.storage.session`, `chrome.windows`, `chrome.action.onClicked` (popup is used instead), `chrome.bookmarks`, `chrome.history`.

---

## 4. Storage schema

All keys live in `chrome.storage.local`. `chrome.storage.sync` is NOT used.

| # | Key | Type / shape | Default | Purpose |
|---|---|---|---|---|
| 1 | `autoApplyRunning` | `boolean` | `false` (treat absent as `false`) | Single-source-of-truth for the running flag. Mirrored from content script + popup + background. |
| 2 | `lastScriptActivity` | `number` (epoch ms) | absent | Heartbeat from content's `updateScriptActivity` interval; used for auto-recovery in `checkAndPrepareRunState(allowAutoRecovery=true)` (within 30 s). |
| 3 | `lastJobSearchUrl` | `string` (URL) | absent | The most recent jobs-search URL the script ran on. Currently written but not read anywhere — kept for future "resume" UX. |
| 4 | `defaultFields` | `Record<string, string>` with keys `YearsOfExperience`, `FirstName`, `LastName`, `PhoneNumber`, `City`, `Email` | `{ YearsOfExperience:'', FirstName:'', LastName:'', PhoneNumber:'', City:'', Email:'' }` (written on first load of formControl page if missing) | The "personal info" defaults reused across LinkedIn forms. |
| 5 | `inputFieldConfigs` | `Array<{ placeholderIncludes: string; defaultValue: string; count: number; createdAt?: number }>` | `[]` | Per-question text answers learned by the script (and editable in formControl page). `count` increments each time the script encounters the same placeholder. `createdAt` is set on first creation (sometimes — see notes below). |
| 6 | `radioButtons` | `Array<{ placeholderIncludes: string; defaultValue: string; count: number; options: Array<{ value: string; text: string; selected: boolean }>; createdAt?: number }>` | `[]` | Per-question radio answers. |
| 7 | `dropdowns` | `Array<{ placeholderIncludes: string; value?: string; count?: number; options: Array<{ value: string; text: string; selected: boolean }>; createdAt?: number }>` | `[]` | Per-question dropdown answers. (`count` is set on creation by content.js but not by background's `updateDropdownConfig`.) |
| 8 | `externalApplyData` | `Array<{ title: string; link: string; companyName: string; time: number }>` | `[]` | List of jobs that required external application. Deduped by `link` AND by `(title, companyName)`. Sorted desc by `time`. |
| 9 | `savedLinks` | `Record<string, string>` (linkName → url) | `{}` | User-named saved job-search URLs (popup → "Save job search link"). |
| 10 | `badWords` | `string[]` | `[]` | Words to look for in the job description (via `\b<word>\b`). Match → skip and record. |
| 11 | `badWordsEnabled` | `boolean` | `true` (filterSettings.js falls back to `?? true`) | Toggle for the bad-word filter. |
| 12 | `titleFilterWords` | `string[]` | `[]` | "Job title must contain at least one of" words. |
| 13 | `titleFilterEnabled` | `boolean` | `true` | Toggle. |
| 14 | `titleSkipWords` | `string[]` | `[]` | "Skip job if title contains any of" words. |
| 15 | `titleSkipEnabled` | `boolean` | `true` | Toggle. |
| 16 | `cvFiles` | `Array<{ id: string; name: string }>` | `[]` | List of registered CV file names. `id` is `cv_${Date.now()}_${rand}`. |
| 17 | `selectedCvFile` | `string \| null` | `null` | Currently selected `cvFiles[i].id`. |
| 18 | `selectedCvFileFilters` | `Record<cvFileName, string[]>` | `{}` | Per-CV list of job-title strings (used for "smart select" exact-match priority). Keyed by file name. |
| 19 | `smartSelectEnabled` | `boolean` | `false` | Toggle for "Smart Select CV" — when true, the script picks the best-matching CV by job title using `findBestMatch` plus the per-CV filters as exact-match data. |
| 20 | `applyHistory` | `Array<{ timestamp: number; jobId: string \| null; title: string; companyName: string; url: string; applied: boolean; reason: string; description: string \| null }>` | `[]` | Append-prepend log of every iteration outcome. Capped at `AA_HISTORY_LIMIT = 2000`. `reason` is one of `AA_REASONS` (see §2.2.6 + §5 reason enum). |

Read-in / written-in detail per key (cross-reference for the wrappers in `lib/storage.ts`):

- `autoApplyRunning` — read: `background.js:320`, `content/content.js:139,2155`, `popup/popup/popup.js:251,321`. write: `background.js:163,308,315`, `content/content.js:73`, `popup/popup/popup.js:270,274,315`.
- `lastScriptActivity` — read: `content/content.js:147`. write: `content/content.js:55,75`.
- `lastJobSearchUrl` — read: nowhere. write: `content/content.js:1864`.
- `defaultFields` — read: `background.js:77`, `content/content.js:467,1706`, `popup/formControl/formControl.js:285,391`. write: `popup/formControl/formControl.js:288,394`.
- `inputFieldConfigs` — read: `background.js:4,334,360,399`, `content/content.js:473`. write: `background.js:14,352,367,381`.
- `radioButtons` — read: `background.js:410,426`, `content/content.js:565`, `popup/formControl/formControl.js:42`. write: `background.js:420,431`, `content/content.js:647,652`.
- `dropdowns` — read: `background.js:445,481`, `content/content.js:657`, `popup/formControl/formControl.js:49,191`. write: `background.js:476,488`, `content/content.js:726`.
- `externalApplyData` — read: `background.js:22`, `popup/externalApply/externalApply.js:14,30,43,129`. write: `background.js:46`, `popup/externalApply/externalApply.js:23,57,132`.
- `savedLinks` — read: `content/content.js:2196`, `popup/popup/popup.js:80,120,164`. write: `content/content.js:2199`, `popup/popup/popup.js:99,105,167`.
- `badWords` — read: `content/content.js:250`, `popup/filterSettings/filterSettings.js:47,97`. write: `popup/filterSettings/filterSettings.js:100,144`.
- `badWordsEnabled` — read: `popup/filterSettings/filterSettings.js:26`. write: `popup/filterSettings/filterSettings.js:34`. Note: content uses the local var `badWordsEnabled` passed by `runScript` after a single `chrome.storage.local.get`.
- `titleFilterWords`, `titleSkipWords`, `titleFilterEnabled`, `titleSkipEnabled` — same shape as `badWords`/`badWordsEnabled` but in `popup/filterSettings/filterSettings.js` and consumed by `content/content.js:1907-1918`.
- `cvFiles`, `selectedCvFile`, `selectedCvFileFilters`, `smartSelectEnabled` — read: `content/content.js:1127`, `popup/cvManager/cvManager.js:*`. write: `popup/cvManager/cvManager.js:*`.
- `applyHistory` — read: `content/utils.js:1311`, `popup/applyHistory/applyHistory.js:223`. write: `content/utils.js:1315`, `popup/applyHistory/applyHistory.js:234,241`.

`createdAt` quirks:
- `inputFieldConfigs`: set by `updateInputFieldConfigsInStorage` (background) on creation; NOT set by `updateOrAddInputFieldValue` (background); also lazily back-filled inside `performRadioButtonChecks` for radios when missing.
- `dropdowns`: set by `updateDropdownConfig` on create; not set by `performDropdownChecks` initial creation.
- `radioButtons`: set on create by `performRadioButtonChecks`; lazy back-fill if missing on update.
- The new build should normalise: always set `createdAt` on create.

---

## 5. Messaging contracts

All actions go through `chrome.runtime.sendMessage` (popup ↔ background, content ↔ background) or `chrome.tabs.sendMessage` (background ↔ content, popup ↔ content). String literal `action` field on every message.

| Action | Sender file(s) | Listener file | Request payload | Response payload | Purpose |
|---|---|---|---|---|---|
| `externalApplyAction` | `content/content.js:1506` | `background.js:54` | `{ data: { jobTitle: string; currentPageLink: string; companyName: string } }` | `{ success: bool; error?: string }` | Persist a job that requires external apply. |
| `openDefaultInputPage` | `content/content.js:1887` | `background.js:64` | none | none | Open formControl page when defaults are missing. |
| `startAutoApply` | `popup/popup/popup.js:263` | `background.js:66` | `{ tabId: number }` | `{ success: bool; message?: string }` | Validate page + defaults, then `executeScript` to call `runScript()` in content. |
| `stopAutoApply` | `popup/popup/popup.js:263`; `content/content.js:106` | `background.js:162` | `{ tabId: number }` | `{ success: bool; message?: string }` | Set `autoApplyRunning=false` and tell content to hide the running modal. |
| `openTabAndRunScript` | `content/content.js:2183`; `popup/popup/popup.js:142` | `background.js:221` | `{ url: string }` | `{ success: bool; message?: string }` | Open a saved-link URL in a new tab and start auto-apply on it. |
| `updateInputFieldValue` | `content/content.js:?` (inferred); `popup/formControl/formControl.js:221, 369` | `background.js:268` | `{ data: { placeholder: string; value: string } }` | `{ success: bool; message?: string }` | Upsert `inputFieldConfigs[placeholderIncludes].defaultValue`. |
| `updateInputFieldConfigsInStorage` | `content/content.js:508` | `background.js:277` | `{ data: string }` (the placeholder) | `{ success: bool; message?: string }` | Increment `count` for an existing config or create a new one with `count:1, createdAt:now`. |
| `deleteInputFieldConfig` | `popup/formControl/formControl.js:268` | `background.js:286, 391` (duplicate listener) | `{ data: string }` (the placeholder) | none | Remove a config. |
| `getInputFieldConfig` | `content/content.js:341`; `popup/formControl/formControl.js:56` | `background.js:289` | none | `inputFieldConfigs` array (raw, not wrapped) | Read all configs. |
| `updateRadioButtonValueByPlaceholder` | `popup/formControl/formControl.js:114` | `background.js:292` | `{ placeholderIncludes: string; newValue: string }` | none | Update selected radio for a given question. |
| `deleteRadioButtonConfig` | `popup/formControl/formControl.js:124` | `background.js:294` | `{ data: string }` | none | Remove a radio question entry. |
| `updateDropdownConfig` | `popup/formControl/formControl.js:202` | `background.js:296` | `{ data: { placeholderIncludes: string; value: string; options: Array<{ value, text, selected }> } }` | none | Update selected option for a dropdown. |
| `deleteDropdownConfig` | `popup/formControl/formControl.js:211` | `background.js:298` | `{ data: string }` | none | Remove a dropdown entry. |
| `checkAutoApplyStatus` | `popup/popup/popup.js:308` | `background.js:300` | `{ tabId: number }` | `{ isRunning: bool }` | Ask content if it's actually running and reconcile storage. |
| `showNotOnJobSearchAlert` | `background.js:91` | `content/content.js:2136` | none | `{ success: bool; error?: string }` | Show "not on jobs search page" modal. |
| `showFormControlAlert` | `background.js:116` | `content/content.js:2147` | none | `{ success: bool; error?: string }` | Show "fill form control" modal. |
| `hideRunningModal` | `background.js:190, 242` | `content/content.js:2213` | none | `{ success: bool; message?: string }` | Hide running modal. |
| `showRunningModal` | `background.js:226` | `content/content.js:2211` | none | `{ success: true }` | (No-op success — modal display is left to other flows.) |
| `getCurrentUrl` | `popup/popup/popup.js:23` | `content/content.js:2160` | none | `{ url: string }` | Read `window.location.href` from the active tab. |
| `checkScriptRunning` | `background.js:303` | `content/content.js:2154` | none | `{ isRunning: bool }` | Content-side echo of `autoApplyRunning`. |
| `showSavedLinksModal` | (none — old caller removed; see §9) | `content/content.js:2163` | `{ savedLinks: Record<string, string> }` | `{ success: true }` | Legacy modal flow for saved links — currently dead in the popup. |
| `autoApplyRunning` | `content/content.js:126` | (none — no handler) | none | none | Vestigial ping; safe to drop. |

`AA_REASONS` enum (drawn from `content/utils.js`):

```
applied | alreadyApplied | external | noEasyApply | sduiNotSupported |
titleSkip | titleFilterMissing | badWord | noTitle | noClickTarget |
clickFailed | detailsNotLoaded | limitReached | submitNotConfirmed |
noSubmitButton | error | other
```

These should become a TypeScript discriminated union or `as const` enum in `lib/types.ts`.

---

## 6. External dependencies

- **Runtime libraries**: none. The extension is fully vanilla JS. No `<script src="https://...">` tags. No bundler. No transpilation.
- **CSS frameworks**: none. Hand-written CSS in each sub-page; one shared `popup/global.css` for the toggle-switch styling.
- **Fonts**: none. Pages use system stack (`Arial, sans-serif` and `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`). The notOnJobSearchModal references `<i class='fas fa-search'>` (FontAwesome) but FontAwesome is NOT loaded anywhere — the icon will silently render as nothing. New build can drop or replace with a Lucide React icon.
- **Dev dependencies** (`package.json`): `archiver` and `fs-extra` (used by `pack-extension*.js` zip-build scripts), and `@types/chrome`. None ship to users.
- **Polyfill**: `browser-polyfill.js` exists in the repo root but is NOT listed in the manifest — it's dead weight from an earlier Firefox attempt. Don't carry over.

---

## 7. Assets

- `assets/images/256256.png` (≈73 KB) — primary icon used at 16/48/128 sizes (browser will downscale).
- `assets/images/128128.png` (≈23 KB) — alternate copy of the icon (not referenced by the manifest).
- `assets/images/on_search_robot.png` (≈98 KB) — illustration; not referenced by the manifest. Likely used in the README.
- `assets/for_readme/` — image assets only used in the README; ignore for the extension build.
- No `_locales/` folder. No internationalisation. Every string is English.
- No fonts.
- No HTML/CSS/JS files in `assets/`.

For the new build: regenerate proper-sized 16 / 48 / 128 PNGs from the 256 source and drop the unused PNGs.

---

## 8. Feature checklist (user-visible)

Flat numbered list. Each row is a parity test in Phase 5.

1. Open the extension popup from the toolbar action.
2. In the popup, click "External Apply" → opens the External Apply page in a new tab.
3. In the popup, click "Settings" → opens the Settings hub in a new tab.
4. In the popup, click "Apply History" → opens the Apply History page in a new tab.
5. In the popup, click "Save job search link" → if not on `linkedin.com/jobs*`, alert "Saved is only available on the LinkedIn jobs search page." and bail.
6. In the popup, click "Save job search link" while on a jobs page → modal opens pre-filled with the current URL; Save persists `savedLinks[name] = url`.
7. In the popup, the "Save job search link" modal validates name + url required, name uniqueness, and url uniqueness (when not editing).
8. In the popup, click "Show job search links" → toggles an inline accordion below the buttons listing all `savedLinks`.
9. In the saved-links accordion, click "Go" on a row → opens the URL in a new tab and runs auto-apply on it.
10. In the saved-links accordion, click "Edit" on a row → reopens the modal pre-filled for editing; Save updates the entry (renames the key if name changed).
11. In the saved-links accordion, click "Delete" on a row → removes the entry from storage and re-renders the list.
12. In the popup, "Start Auto Apply" button shows current run state on open (queries content via `checkAutoApplyStatus`).
13. Clicking "Start Auto Apply" while on a non-LinkedIn-jobs page → background sends `showNotOnJobSearchAlert` → in-page modal shown with "Go To Job Search" + "OK".
14. Clicking "Start Auto Apply" with empty `defaultFields` → background sends `showFormControlAlert` → in-page modal "Form Control Required" with "OK".
15. Clicking "Start Auto Apply" while on a LinkedIn jobs search page with all defaults set → script starts, button toggles to "Stop Auto Apply" (orange, with running icon).
16. Clicking "Stop Auto Apply" while a run is active → script stops, in-page running modal hidden, button toggles back.
17. Auto-apply iterates over the current page's job cards, supporting both LinkedIn UIs: legacy `/jobs/search/` and new `/jobs/search-results/` (SDUI shadow DOM).
18. Auto-apply skips cards already showing the "Applied" badge (recorded as `alreadyApplied`).
19. Auto-apply applies the `Title Must Skip` filter first (per `titleSkipEnabled` + `titleSkipWords`); match → skip, record `titleSkip`.
20. Auto-apply then applies the `Title Must Contain` filter (per `titleFilterEnabled` + `titleFilterWords`); no match → skip, record `titleFilterMissing`.
21. Auto-apply then loads job details panel; if it never loads in 12 s → record `detailsNotLoaded`.
22. Once details are loaded, if `badWordsEnabled` and the job description matches any `badWords` regex `\b<word>\b` → skip, record `badWord`.
23. If the job has only a non-Easy-Apply ("Apply on company website") button → save to `externalApplyData`, record `external`.
24. If neither Easy Apply nor an external apply control is found → record `noEasyApply` (or `alreadyApplied` if the card is now showing the badge).
25. Easy Apply path: click apply button, wait for the modal (legacy artdeco or SDUI shadow DOM), then walk the form: text inputs / autocomplete / textareas, radios, dropdowns, generic checkboxes (including agreement keywords), city checkbox.
26. Each unfamiliar text-field placeholder is sent via `updateInputFieldConfigsInStorage` so it shows up in Form Control with `count` incremented.
27. Each unfamiliar radio question is added to `radioButtons` with the first option preselected.
28. Each unfamiliar dropdown is added to `dropdowns` with the second option (`options[1]`) preselected.
29. Easy Apply walks Continue → Next → Review → Submit, calling `runApplyModel` recursively.
30. Before clicking Submit, the script unchecks the "Follow company" checkbox if checked.
31. After clicking Submit, the script waits up to 8 s for the "Your application was sent" modal. Seen → record `applied`. Submit clicked but no modal → record `submitNotConfirmed`. Modal opened but Submit never reached → record `noSubmitButton`.
32. After confirmation, dismiss the success modal so the next iteration starts clean.
33. If LinkedIn shows the "Save this application?" alert dialog at any point, click Discard automatically. Repeated failures (5) or excessive wait (30 s) → stop the script.
34. Periodic save-modal monitoring runs every 2 s while a run is active.
35. Periodic extension-context monitoring runs every 10 s; three failures → stop.
36. After every iteration, advance to the next item; after the last item on the page, click the next-page button (UI-aware). No next button → stop.
37. If LinkedIn's daily Easy Apply limit is hit ("You've exceeded the daily application limit") → record `limitReached` and stop after a blinking-border highlight.
38. If a CV is selected (`selectedCvFile`) and the apply modal exposes resume attachment cards, select the matching attachment by case-insensitive `includes(name)` match.
39. If `smartSelectEnabled` is true and a job title is known, the matching CV name is chosen via `findBestMatch` (token + Jaro-Winkler + bigram), with `selectedCvFileFilters` providing exact-match priority hints.
40. Filter Settings page — toggle "About the job bad words" on/off, edit/add/delete words.
41. Filter Settings page — toggle "Job Title Must Contain" on/off, edit/add/delete words.
42. Filter Settings page — toggle "Job Title Must Skip" on/off, edit/add/delete words.
43. Filter Settings page — duplicate add (case-insensitive) shows alert and is rejected.
44. Form Control page — fill / clear the six personal-info fields; status banner switches between "Please fill out the missing values:" (red) and "You are ready to use auto apply!" (green) reactively.
45. Form Control page — empty fields highlighted with `.input-error` style.
46. Form Control page — entering FirstName / LastName / PhoneNumber also writes the matching `inputFieldConfigs` entry under "First name" / "Last name" / "Mobile phone number".
47. Form Control page — Text Fields Entry list, sortable by `createdAt` desc then `count` desc; per-row Update + Delete.
48. Form Control page — Radio Buttons Entry list with per-row radio group (label = `option.value` unless numeric, then `option.text`); change saves; Delete removes.
49. Form Control page — Dropdowns Entry list with per-row `<select>`; change saves; Delete removes.
50. Form Control page — live updates via `chrome.storage.onChanged` (changes from another tab reflect immediately).
51. External Apply page — list of every saved external job with company / time / title / link / Delete.
52. External Apply page — header buttons: REMOVE ALL (wipes), Remove duplicate links (de-dupe by URL keeping first), Open all links (window.open every entry).
53. External Apply page — top counter "Total links: N".
54. CV Manager page — list of saved CV files with per-row Manage / Select / Edit / Delete; "Selected" file gets a gradient highlight.
55. CV Manager page — Smart Select CV toggle (top right) writes `smartSelectEnabled`.
56. CV Manager page — Add CV modal validates non-empty name and uniqueness; uses `cv_${Date.now()}_${rand}` IDs.
57. CV Manager page — Edit CV renames; rename propagates the per-CV filter list to the new key.
58. CV Manager page — Delete CV removes; if it was selected, re-selects the first remaining (or `null`); strips the per-CV filter entry.
59. CV Manager page — Manage opens the right-hand "Job Title Filters for: <name>" panel.
60. CV Manager page — per-CV Add Filter / Edit Filter / Delete Filter (with confirm on delete).
61. Settings page — four cards: Form Control, Filter Settings, CV Files, Data Management.
62. Settings page → Data Management — Export downloads `autoapply_settings_${dd}_${mm}_[${HH}_${MM}].json` containing the whole `chrome.storage.local`.
63. Settings page → Data Management — Import reads a `.json` file, calls `chrome.storage.local.set(parsed)`, alerts "Settings imported successfully!".
64. Apply History page — table of every iteration with stats pills, status filter, reason filter (auto-populated), free-text search.
65. Apply History page — per-row × delete; Clear all (with confirm overlay); Export CSV (respects current filters).
66. Apply History page — live refresh via `chrome.storage.onChanged`.
67. Apply History page — per-reason colour-coded pill, YES/NO badge in Applied column.
68. In-page running modal (visible while a script run is active in a tab) — shows "Script is Running" with a Stop button.
69. In-page "Please navigate to jobs search page" modal — shown when starting on a non-jobs URL; "Go To Job Search" button takes the user to `https://www.linkedin.com/jobs/search`.
70. In-page "Form Control Required" modal — shown when defaults are missing; OK button just hides the modal.

---

## 9. Risks / quirks

1. **Manifest content-script order vs runtime dependency.** The manifest lists `utils → createElements → content → xpaths`, but `content.js` relies on `easy_apply_button` / `not_easy_apply_button` defined in `xpaths.js`. Currently it works because the constants are referenced inside async functions and `xpaths.js` is loaded synchronously before they're called. The new build should put `xpaths.js` (or its successor module) first, or import explicitly.
2. **Two `chrome.runtime.onMessage` listeners in background.** `background.js:52` (main) and `background.js:390` (a duplicate that re-handles `deleteInputFieldConfig`). Harmless but confusing. Drop the duplicate in the new build.
3. **Vestigial messages and dead handlers.**
   - `autoApplyRunning` ping from content has no handler in background.
   - `showSavedLinksModal` handler in content references `savedLinksOverlay`, which has no HTML file (modal injection skips it). The popup now renders the saved-links list inline. Drop both.
   - `lastJobSearchUrl` is written but never read.
   - `browser-polyfill.js` sits in the repo root but is not in the manifest.
4. **`createdAt` is sometimes set, sometimes not.** Different code paths set `createdAt` inconsistently for `inputFieldConfigs` / `radioButtons` / `dropdowns`. Older entries can lack the field entirely, which the form-control sort handles by treating it as `-Infinity`. New build should always set `createdAt: Date.now()` on creation.
5. **`chrome.storage.local` schema is not versioned.** A migration shim (Phase 6) needs to be defensive against missing keys, missing nested fields, and old shapes (e.g. `inputFieldConfigs` entries without `count`).
6. **Manifest matches `<all_urls>`.** The content scripts and modals run on every page on the internet, even though only LinkedIn pages do anything (the early return in `createElements.js:1` and the `isJobsSearchPage()` check in `runScript`). New build can scope to `https://*.linkedin.com/*` to reduce load and Chrome-warning surface.
7. **`<all_urls>` in `web_accessible_resources` is unnecessarily broad.** Only LinkedIn needs to fetch the modal HTML. WXT shadow-DOM UI removes this concern entirely.
8. **In-page modals are injected by `fetch` + DOM mutation.** Brittle: if LinkedIn's CSP changes, the modal CSS / script loads can be blocked. The new build will mount React via `createShadowRootUi()` which is CSP-safe and style-isolated.
9. **Sequence of save-modal handling has overlapping guards.** `isSaveModalBeingHandled`, `lastSaveModalHandleTime`, `MAX_SAVE_MODAL_FAILURES`, `MAX_SAVE_MODAL_WAIT_TIME`, plus a periodic 2-s monitor AND inline calls inside `runApplyModelLogic` — intricate, race-prone. Worth re-implementing as a single state machine.
10. **XPath count is small (2 in `xpaths.js`)** but each XPath is a union of three strategies; brittleness lives in the `aria-label` strings (`'linkedin apply to'`, `'apply on company website'`). Not under our control. Plus content.js itself contains many CSS / attribute selectors targeting LinkedIn's class names (`.scaffold-layout__list-item`, `.jobs-loader`, `[data-testid="interop-shadowdom"]`, etc.) — these are the real fragility. Audit them quarterly, not monthly.
11. **Mixed string-based message dispatch with no central registry.** `action: 'externalApplyAction'` etc. are string-literal keys spread across files. Exactly the situation `lib/messaging.ts` (typed `defineExtensionMessaging` `ProtocolMap`) is meant to fix.
12. **Background-side `currentInputFieldConfigs` top-level let.** Service workers can be torn down at any time; this in-memory cache is unreliable. Just delete it in the new build and rely on storage reads.
13. **`alert()` and `confirm()` are used in popup pages.** WXT/React build should use shadcn `<AlertDialog>` / toast for parity but better UX.
14. **`<i class='fas fa-search'>` references FontAwesome that is not loaded.** Replace with a Lucide React icon in the new build.
15. **MV3 `executeScript` is used to "kick off" an already-running content script's `runScript()` global.** This works because the content script declares `runScript` at top level. The new build can call this through messaging instead, removing the need for `chrome.scripting`.
16. **Defaults for filter-toggle keys are computed via `?? true`** at read time — there's no first-install seeding. New build should seed sane defaults via `wxt/storage`'s `fallback`.
17. **`popup/popup/popup.js` and `popup/settings/settings.js` both `<script src="../../content/utils.js">`.** They use only `getTime()`. The new build should put helpers in `lib/utils.ts` and import directly.
18. **Inline styles in popup.js (`button.style.backgroundColor = "rgb(...)"`)** to flip "Show / Hide job search links" colour. Replace with a state class in the React component.
19. **Per-iteration sleeps everywhere (`addDelay(...)`)** are baked into the flow as 200–3000 ms `setTimeout`s. They're necessary because LinkedIn's UI is async and we don't have hooks into its render lifecycle. Carry over verbatim — don't try to "optimise" them out.
20. **Two simultaneous form-control / settings tabs can race.** Two open formControl pages will both write `defaultFields[fieldName]` on `change` — last writer wins. Acceptable, but worth a note in the new build.
21. **`@webext-core/messaging` requires both sides to call `defineExtensionMessaging` with the same `ProtocolMap`.** When wiring background ↔ content for `runScript`, ensure the new build doesn't fall back to `chrome.scripting.executeScript` halfway.

---

End of audit.
