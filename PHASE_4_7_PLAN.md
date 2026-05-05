# Phase 4.7 — Content script port plan

Source files (read-only reference):
- `D:\codding\My_projects\ChromeExtentions\autoApplylinkedin\content\utils.js` (1416 lines)
- `D:\codding\My_projects\ChromeExtentions\autoApplylinkedin\content\content.js` (2335 lines)

---

## A. Pure helpers (port into testable `lib/` modules)

These take primitive values in and return primitive values out — no DOM, no `chrome.*`, no `window`, no I/O. They are 100% unit-testable with Vitest.

| # | Function | Source | Signature | Purpose |
|---|----------|--------|-----------|---------|
| 1 | `getTime` | utils.js:9-17 | `() => { day, month, year, hour, minute }` | Returns current local time as zero-padded 2-char strings (`year` is 2-digit). Pure on `Date.now()` only. |
| 2 | `normalizeString` | utils.js:336-338 | `(str: string) => string` | Lowercases and strips spaces, hyphens, underscores. |
| 3 | `levenshteinDistance` | utils.js:357-382 | `(a: string, b: string) => number` | Classic edit-distance. Used by `findClosestField` for fuzzy label matching. |
| 4 | `findClosestField` | utils.js:384-430 | `(defaultFields: Record<string, string>, inputString: string) => string \| undefined` | Finds the best key in `defaultFields` matching `inputString`. First tries substring containment, breaks ties via Levenshtein-normalized score; falls back to Levenshtein over all keys. Threshold 0.4. |
| 5 | `stem` | utils.js:440-459 | `(word: string) => string` | Tiny English stemmer: strips `ies/es/s/ing/ed` suffixes with length guards. |
| 6 | `tokenize` | utils.js:461-475 | `(str: string) => string[]` | Splits on camelCase boundaries, separators, non-alphanumerics; lowercases; drops `STOP_WORDS`; stems remaining tokens. |
| 7 | `jaroWinkler` | utils.js:477-523 | `(s1: string, s2: string) => number` | Returns similarity in `[0..1]` with Winkler prefix bonus (max prefix 4). |
| 8 | `tokenSimilarity` | utils.js:525-568 | `(tokens1: string[], tokens2: string[]) => number` | Greedy best-match between two token arrays. Exact = 1.0; substring overlap = 0.8 × ratio; otherwise jaro-winkler ≥ 0.85 → 0.7 × score. Normalised by `max(len)`. |
| 9 | `ngramSimilarity` | utils.js:570-591 | `(s1: string, s2: string, n?: number) => number` | Jaccard similarity over character n-grams (default n=2). |
| 10 | `calculateSimilarity` | utils.js:593-606 | `(query: string, candidate: string) => number` | Weighted blend: `0.4 * tokenScore + 0.35 * jaroWinkler + 0.25 * ngramScore`. |
| 11 | `findBestMatch` | utils.js:608-661 | `({ array, searchString, threshold?, exactMatchData? }) => string \| null` | Picks best item in `array` for `searchString`. Accepts optional `exactMatchData: Record<key, string[]>` for hard overrides (full-string-equal, then first-word-equal). Threshold default 0.3. Critical: ports as-is — used for both label-config matching and CV smart-select. |
| 12 | `getJobLink` | utils.js:874-880 | `(linkOrHref: string \| null) => string` | Normalises a LinkedIn href to absolute URL (prefixes `https://www.linkedin.com` when relative). Note: takes a DOM-ish object only to read `href` — port as `(href: string \| null) => string`. |
| 13 | `buildLinkedInJobUrl` | utils.js:1274-1277 | `(jobId: string \| null) => string` | Returns `https://www.linkedin.com/jobs/view/<id>/` or `''`. |
| 14 | `matchesFilter` | content.js:188-203 | `(text: string, word: string) => boolean` | Whole-word regex match for words ≤ 4 chars; substring `includes` otherwise. Both lower-cased. Used for title/company filter words. |
| 15 | `checkIfAlreadyApplied` | content.js:923-932 | `(textContent: string) => boolean` | True iff text contains `"applied"` AND any of `ago/minutes/hours/days`. |
| 16 | `STOP_WORDS` constant | utils.js:433-438 | `Set<string>` | English stop words used by `tokenize`. Export from same module. |
| 17 | `AA_REASONS` enum | utils.js:1252-1270 | frozen object of reason strings | Apply-history reason codes. Pure data — port as a `const` object or string-literal union type. |
| 18 | `AA_HISTORY_LIMIT` | utils.js:1272 | `2000` | Cap for history array length. |
| 19 | `recordApplyHistoryEntry` (extracted **pure** half) | utils.js:1282-1320 | `(prevHistory: HistoryEntry[], newEntry: HistoryEntry, limit?: number) => HistoryEntry[]` | The data shape: build entry, prepend, trim to `AA_HISTORY_LIMIT`. Extract the `unshift + length cap` into a pure `appendApplyHistoryEntry(prev, entry)`. Storage write stays in a thin async wrapper. Entry-builder (timestamp/url/reason resolution) is also pure if `item` is pre-resolved by the caller. |
| 20 | `AA_UI_*` constants | utils.js:906-908 | string literals | Discriminator strings. |

Notes:
- **Helpers that look pure but aren't:** `isElementVisible` (uses `getComputedStyle` + DOM layout), `getJobTitle` (DOM read), `extractJobTitleFromItem` (DOM read), `getJobIdFromItem` (DOM read), `extractCompanyNameFromItem` (DOM read), `isItemAlreadyApplied` (DOM read). All belong in section B.
- `recordApplyHistoryEntry` is the only function that's mixed — split into a pure `appendApplyHistoryEntry` and an impure `recordApplyHistoryEntry` that wraps it with storage I/O.

---

## B. DOM / LinkedIn-specific helpers (content-only module)

Listed for completeness — do **not** port without live LinkedIn verification.

### From `utils.js`

| Function | Source | Purpose (1-liner) |
|----------|--------|-------------------|
| `addDelay` | utils.js:1-7 | `setTimeout` Promise — not pure (timer) but trivial; keep in `dom-utils`. |
| `getVisibleElementByXPath` | utils.js:19-38 | XPath query returning first visible `HTMLElement`. |
| `isElementVisible` | utils.js:40-48 | Visibility check via `offsetParent`/`offsetWidth`/`getComputedStyle`. |
| `getElementsByXPath` | utils.js:50-69 | All `HTMLElement` matches for an XPath. |
| `waitForElements` | utils.js:71-125 | Polls every 100ms until visible matches appear or timeout. |
| `clickElement` | utils.js:127-172 | Scrolls into view, awaits 800ms, clicks. |
| `fillAutocompleteField` | utils.js:174-334 | Focuses field, sets value, hunts for typeahead dropdown across many selectors, clicks first option. LinkedIn-specific selectors. |
| `setNativeValue` | utils.js:340-355 | Calls native value setter so React `onChange` fires. |
| `waitForLoaderToDisappear` | utils.js:664-686 | Polls for `[class*="loader"]` to be invisible. |
| `waitForJobsLoaderToDisappear` | utils.js:688-710 | Same, scoped to `.jobs-loader`. |
| `handleDiscardConfirmDialog` | utils.js:712-742 | Clicks Discard on the artdeco/save-application confirm dialog. |
| `findEasyApplyModal` | utils.js:752-778 | Three-strategy lookup of the legacy Easy-Apply modal. |
| `ensureNoApplicationModalOpen` | utils.js:780-821 | Loop that closes any open apply modal (legacy + SDUI). |
| `waitForJobsLoaderToDisappearAndHandle` | utils.js:823-872 | Wait for loader, click outside if stuck, then close modal. |
| `detectJobsUI` | utils.js:910-925 | Returns `legacy` / `new` / `unknown` based on DOM signals + URL. |
| `isJobsSearchPage` | utils.js:927-935 | True for `/jobs/search*`, `/jobs/collections`, or DOM signals. |
| `getNewUiJobsListColumn` | utils.js:939-947 | Locates the LazyColumn that holds dismiss buttons. |
| `getJobItems` | utils.js:953-986 | Returns job-card array for active UI variant. |
| `getDismissButtonForItem` | utils.js:989-1001 | Finds the per-card Dismiss button (new UI). |
| `extractJobTitleFromItem` | utils.js:1004-1029 | Reads the title via dismiss-button aria-label or legacy link. |
| `getJobItemClickTarget` | utils.js:1034-1042 | Returns the `<a>` (legacy) or role=button card (new). |
| `extractCompanyNameFromItem` | utils.js:1045-1074 | Best-effort company text from card subtitle / leaf nodes. |
| `isItemAlreadyApplied` | utils.js:1083-1101 | Looks for "Applied" footer/badge across both UIs. |
| `getInteropShadowRoot` | utils.js:1113-1116 | Returns the SDUI shadow root or null. |
| `findSduiApplyModal` | utils.js:1118-1126 | Locates the Easy-Apply dialog inside the shadow root. |
| `dismissSduiApplyModal` | utils.js:1128-1147 | Clicks Dismiss/Close inside the shadow modal. |
| `getPaginationInfo` | utils.js:1150-1185 | Returns active page text + next button per UI. |
| `waitForJobItems` | utils.js:1188-1196 | Polls `getJobItems()` until non-empty. |
| `waitForJobDetailsLoaded` | utils.js:1207-1242 | Polls for apply-control / save-button / URL `currentJobId`. |
| `findJobItemByJobId` | utils.js:1326-1341 | Re-resolves a card by job id (handles LazyColumn re-render). |
| `findApplicationSentModal` | utils.js:1348-1366 | Finds the post-submit success modal in main DOM or shadow root. |
| `waitForApplicationSentModal` | utils.js:1369-1377 | Polls for the success modal to appear. |
| `getJobIdFromItem` | utils.js:1382-1393 | Reads `data-occludable-job-id` / `componentkey` / nested `data-job-id`. |
| `getJobsListScrollContainer` | utils.js:1396-1416 | Walks up to nearest scrollable ancestor of jobs column. |
| `aaLog`/`aaWarn`/`aaError` | utils.js:893-895 | Bound `console.*` methods (must be bound, not wrapped, to preserve call-site). |

### From `content.js`

| Function | Source | Purpose (1-liner) |
|----------|--------|-------------------|
| `isExtensionContextValidQuiet` | content.js:36-50 | Probes `chrome.runtime.id` etc. without logging. |
| `isExtensionContextValid` | content.js:2244-2250 | Same, terser. |
| `updateScriptActivity` | content.js:52-60 | Writes `lastScriptActivity: Date.now()`. |
| `setAutoApplyRunning` | content.js:63-87 | Persists `autoApplyRunning` flag + activity ts. |
| `stopScript` | content.js:89-115 | Hides overlay, flips flag, sends `stopAutoApply`. |
| `startScript` | content.js:117-134 | Sends `autoApplyRunning`, flips flag, starts monitors. |
| `checkAndPrepareRunState` | content.js:136-170 | Reads `autoApplyRunning`; auto-recovers within 30s of last activity. |
| `getJobTitle` | content.js:172-186 | Title from `<a>` via inner span or aria-label. |
| `clickDoneIfExist` | content.js:205-227 | Clicks "Done" button inside any modal. |
| `clickJob` | content.js:229-298 | Bad-words pre-check on description, then `runFindEasyApply`. |
| `handleCheckboxField` | content.js:300-336 | Auto-checks agreement-style checkboxes. |
| `performInputFieldChecks` | content.js:338-523 | Walks all input/textarea/select, resolves label, fills via best-match config or `findClosestField`. |
| `performFillForm` | content.js:525-561 | Dispatches `keydown`/`keypress`/`keyup`/`input`/`change` to nudge React. |
| `performRadioButtonChecks` | content.js:563-653 | Restores stored radio answers; otherwise picks first option. |
| `performDropdownChecks` | content.js:655-727 | Same pattern for `<select>`. |
| `performCheckBoxFieldCityCheck` | content.js:729-741 | Auto-checks first checkbox in each `data-test-checkbox-form-component` fieldset. |
| `performSafetyReminderCheck` | content.js:743-757 | Dismisses the LinkedIn safety-reminder modal. |
| `validateAndCloseConfirmationModal` | content.js:759-797 | Closes "Save this application?" via Discard. |
| `handleSaveApplicationModal` | content.js:799-921 | The big save-modal handler — debounced, stops script after N failures. |
| `checkForFormValidationError` | content.js:934-969 | Inspects `.artdeco-inline-feedback__message` for required/invalid wording. |
| `terminateJobModel` | content.js:971-1005 | Dismiss + Discard cycle for the apply modal. |
| `performUniversalCheckboxChecks` | content.js:1007-1079 | Generic agreement-checkbox pass over the modal. |
| `runValidations` | content.js:1081-1108 | Orchestrates input/checkbox/radio/dropdown fillers under one apply modal. |
| `selectCvFile` | content.js:1110-1195 | Reads `cvFiles`/`selectedCvFile`/`smartSelectEnabled` from storage; uses `findBestMatch` to pick the best CV; clicks the matching attachment. |
| `uncheckFollowCompany` | content.js:1197-1225 | Unchecks `#follow-company-checkbox` (legacy + shadow). |
| `toggleBlinkingBorder` | content.js:1226-1241 | Visual notification — flashes red border 5x. |
| `checkLimitReached` | content.js:1677-1693 | True when feedback element matches "exceeded the daily application limit". |
| `isChromeStorageAvailable` | content.js:1695-1699 | Guard. |
| `checkAndPromptFields` | content.js:1701-1712 | Reads `defaultFields` from storage. |
| `fillSearchFieldIfEmpty` | content.js:1714-1744 | Restores last keyword into the jobs search box. |
| `closeApplicationSentModal` | content.js:1746-1766 | Dismisses the success modal. |
| `goToNextPage` | content.js:1770-1841 | Pagination: read `getPaginationInfo`, click next, restart `runScript`. |
| `startExtensionContextMonitoring` / `stopExtensionContextMonitoring` | content.js:2252-2283 | 10s heartbeat that calls `stopScript` after 3 context losses. |
| `startSaveModalMonitoring` / `stopSaveModalMonitoring` | content.js:2285-2320 | 2s polling for save-application modal. |

---

## C. The main automation flow

### `runScript` — content.js:1843-2133

The top-level entry. Triggered by background after navigating to a `/jobs/search*` URL or by message handlers. Sequence: detect UI variant via `detectJobsUI`; bail if unknown or not on a jobs page; persist `lastJobSearchUrl`; start `autoApplyRunning` flag and the heartbeats; check `defaultFields` exist; check `checkLimitReached`. Reads filter settings (`titleSkipEnabled`, `titleFilterEnabled`, `badWordsEnabled`, `titleFilterWords`, `titleSkipWords`) from storage. Iterates `getJobItems()`; for each card: re-fetch by `getJobIdFromItem` to defeat LazyColumn re-renders; check `isItemAlreadyApplied`; pull `jobTitle`/`companyName`; apply title-skip filter (priority 1) then title-must-contain filter (priority 2) — both record an `applyHistory` entry on miss; click the card; wait for `waitForJobDetailsLoaded`; call `clickJob` → `runFindEasyApply`; advance via `goToNextPage` when the page is exhausted. **Storage keys touched:** `autoApplyRunning`, `lastScriptActivity`, `lastJobSearchUrl`, `defaultFields`, `titleSkipEnabled`, `titleFilterEnabled`, `badWordsEnabled`, `titleFilterWords`, `titleSkipWords`, `applyHistory`. **Messages sent:** `openDefaultInputPage`.

### `runFindEasyApply` — content.js:1452-1672

Called per-job after `clickJob` validates bad-words. Detects whether the job has an Easy-Apply control via the `easy_apply_button` XPath; if not, looks for `not_easy_apply_button` (external apply) and either sends `externalApplyAction` to background or records `NO_EASY_APPLY`/`ALREADY_APPLIED`. Last-mile applied check via `findJobItemByJobId` + `isItemAlreadyApplied` (LazyColumn race). Resets `__aaApplyOutcome`, clicks the Easy-Apply button, awaits loaders, calls `runApplyModel`, then maps `__aaApplyOutcome` to a final history entry: `APPLIED`, `SUBMIT_NOT_CONFIRMED`, `NO_SUBMIT_BUTTON`, or `NO_EASY_APPLY`. **Storage:** `applyHistory`. **Messages:** `externalApplyAction`.

### `runApplyModelLogic` (and wrapper `runApplyModel`) — content.js:1244-1450

The per-modal step engine. Wrapped by `runApplyModel` in a 60s `Promise.race` timeout. Picks the apply modal — SDUI shadow root first (`findSduiApplyModal`), then any `.artdeco-modal`. If a "Continue applying" button exists it clicks it and recurses. Looks for Next, Review your application, and Submit application buttons (scoped to the modal so shadow-root queries work). On Submit: `uncheckFollowCompany`, click with up to 3 visibility retries, await `waitForApplicationSentModal`, dismiss the success modal, click "Done" if present. On Next/Review: `selectCvFile`, `runValidations`, check `checkForFormValidationError`, then click and recurse. **Mutates:** module-scope `__aaApplyOutcome` (`reachedModal`, `submitClicked`, `sentModalDetected`). **Storage:** none directly (its callees do). **Messages:** none.

### `clickJob` — content.js:229-298

Per-card pre-flight. Checks loader state and run state, reads `badWords` from storage and tests them against the job description text; if a bad word matches, records `BAD_WORD` and bails. Otherwise hands off to `runFindEasyApply`. **Storage:** `badWords`, `applyHistory`.

---

## D. Module-scope state in `content.js`

These `let`/`const` declarations live at module scope today and must move into the WXT content-script main closure (or a `ctx`-scoped object).

| Declaration | Source | Purpose |
|-------------|--------|---------|
| `autoApplyRunning` | content.js:1 | Local mirror of `chrome.storage.local.autoApplyRunning` (mostly unused — storage is the source of truth). |
| `extensionContextCheckInterval` | content.js:2 | Handle for the 10s context-validity heartbeat. |
| `saveModalCheckInterval` | content.js:3 | Handle for the 2s save-modal poller. |
| `isSaveModalBeingHandled` | content.js:4 | Mutex preventing concurrent save-modal handlers. |
| `lastSaveModalHandleTime` | content.js:5 | Debounce timestamp (4s window). |
| `saveModalDetectedTime` | content.js:6 | First-detected timestamp; gates the 30s timeout. |
| `saveModalFailureCount` | content.js:7 | Counter; >= 5 forces stopScript. |
| `MAX_SAVE_MODAL_WAIT_TIME` | content.js:8 | `30000` constant. |
| `MAX_SAVE_MODAL_FAILURES` | content.js:9 | `5` constant. |
| `__aaApplyOutcome` | content.js:16-20 | Per-application outcome tracker; mutated by `runApplyModelLogic` and consumed by `runFindEasyApply`. Reset by `resetApplyOutcome()`. |
| `defaultFields` | content.js:25-32 | Local stub for default-fields shape; only used as type hint — actual values come from storage. Could be deleted in the rewrite. |
| `prevSearchValue` | content.js:34 | Last typed keyword to restore into the search box. |
| `currentPage` | content.js:1674 | Tracks the active pagination page text. |
| `isNavigating` | content.js:1768 | Mutex on `goToNextPage` to prevent re-entry. |

Recommendation: bundle all of these into a single `ContentRunState` object instantiated inside `defineContentScript({ main(ctx) { ... } })`. Constants (`MAX_*`) go into `lib/constants.ts`.

---

## E. Recommended TypeScript module split

| File | Contents | Testable? |
|------|----------|-----------|
| `lib/fuzzy-match.ts` | `STOP_WORDS`, `stem`, `tokenize`, `normalizeString`, `levenshteinDistance`, `jaroWinkler`, `tokenSimilarity`, `ngramSimilarity`, `calculateSimilarity`, `findClosestField`, `findBestMatch`. | Yes |
| `lib/text-filters.ts` | `matchesFilter`, `checkIfAlreadyApplied`. | Yes |
| `lib/linkedin-urls.ts` | `getJobLink`, `buildLinkedInJobUrl`. | Yes |
| `lib/apply-history.ts` | `AA_REASONS`, `AA_HISTORY_LIMIT`, type `HistoryEntry`, pure `appendApplyHistoryEntry(prev, entry, limit?)`. The async `recordApplyHistoryEntry` wrapper lives in `lib/storage.ts` (or here, gated behind a thin storage call). | Yes (pure half) |
| `lib/time-format.ts` | `getTime` (zero-padded date parts). | Yes |
| `lib/constants.ts` | `MAX_SAVE_MODAL_WAIT_TIME`, `MAX_SAVE_MODAL_FAILURES`, `AA_UI_LEGACY/NEW/UNKNOWN`. | Yes (trivial) |
| `lib/types.ts` | `HistoryEntry`, `JobsUI`, `ApplyOutcome`, filter setting shapes, etc. | n/a |
| `entrypoints/linkedin.content/dom-utils.ts` | `addDelay`, `getVisibleElementByXPath`, `getElementsByXPath`, `isElementVisible`, `waitForElements`, `clickElement`, `setNativeValue`, `fillAutocompleteField`, `aaLog/aaWarn/aaError`. | No |
| `entrypoints/linkedin.content/linkedin-dom.ts` | `detectJobsUI`, `isJobsSearchPage`, `getNewUiJobsListColumn`, `getJobItems`, `getDismissButtonForItem`, `extractJobTitleFromItem`, `getJobItemClickTarget`, `extractCompanyNameFromItem`, `isItemAlreadyApplied`, `getJobIdFromItem`, `findJobItemByJobId`, `getJobsListScrollContainer`, `getPaginationInfo`, `waitForJobItems`, `waitForJobDetailsLoaded`, `getJobTitle`. | No |
| `entrypoints/linkedin.content/modals.ts` | `findEasyApplyModal`, `findSduiApplyModal`, `getInteropShadowRoot`, `dismissSduiApplyModal`, `findApplicationSentModal`, `waitForApplicationSentModal`, `handleDiscardConfirmDialog`, `ensureNoApplicationModalOpen`, `closeApplicationSentModal`, `validateAndCloseConfirmationModal`, `performSafetyReminderCheck`, `clickDoneIfExist`, `terminateJobModel`. | No |
| `entrypoints/linkedin.content/loaders.ts` | `waitForLoaderToDisappear`, `waitForJobsLoaderToDisappear`, `waitForJobsLoaderToDisappearAndHandle`, `toggleBlinkingBorder`. | No |
| `entrypoints/linkedin.content/save-modal.ts` | `handleSaveApplicationModal`, save-modal monitoring start/stop intervals. | No |
| `entrypoints/linkedin.content/form-fillers.ts` | `handleCheckboxField`, `performInputFieldChecks`, `performFillForm`, `performRadioButtonChecks`, `performDropdownChecks`, `performCheckBoxFieldCityCheck`, `performUniversalCheckboxChecks`, `runValidations`, `uncheckFollowCompany`, `selectCvFile`, `checkForFormValidationError`. | No |
| `entrypoints/linkedin.content/run-state.ts` | `ContentRunState` class/record, `setAutoApplyRunning`, `checkAndPrepareRunState`, `updateScriptActivity`, `startScript`, `stopScript`, `startExtensionContextMonitoring`, `stopExtensionContextMonitoring`, `isExtensionContextValid(Quiet)`. | No |
| `entrypoints/linkedin.content/run-script.ts` | `runScript`, `goToNextPage`, `runFindEasyApply`, `runApplyModel`, `runApplyModelLogic`, `clickJob`, `resetApplyOutcome`, `fillSearchFieldIfEmpty`, `checkAndPromptFields`, `checkLimitReached`. | No |
| `entrypoints/linkedin.content/index.ts` | `defineContentScript({ matches: [...], main(ctx) { wire run-state + listeners + boot } })`. | No |
| `entrypoints/linkedin.content/xpaths.ts` | XPath constants (port `xpaths.js`). | Yes (trivial — just exported strings) |

---

## F. Unit-test plan for the pure helpers

### `normalizeString`
- `'Foo Bar'` → `'foobar'`
- `'first-name_test'` → `'firstnametest'`
- empty string → `''`
- already normalised → unchanged

### `levenshteinDistance`
- `('abc','abc')` → 0
- `('','abc')` → 3 and `('abc','')` → 3
- `('kitten','sitting')` → 3 (canonical case)
- `('flaw','lawn')` → 2

### `findClosestField`
- exact substring match returns the value (e.g. `{ FirstName: 'Iliya' }`, input `'first name'`)
- multiple substring matches → tie broken by Levenshtein
- no match within threshold 0.4 → returns `undefined`
- empty `defaultFields` object → returns `undefined`

### `stem`
- `'flies'` → `'fly'`
- `'boxes'` → `'box'`
- `'cats'` → `'cat'`
- `'running'` → `'runn'` (per existing impl) and `'walked'` → `'walk'`
- short word `'is'` → unchanged

### `tokenize`
- `'EasyApplyButton'` → `['easy','appli','button']`
- `'snake_case-string'` → `['snake','case','string']`
- input containing only stop words → `[]`
- numeric tokens preserved: `'web3 dev'` → `['web3','dev']`

### `jaroWinkler`
- identical strings → 1
- one empty → 0
- `('MARTHA','MARHTA')` → ≈ 0.961 (Winkler reference)
- common prefix bonus: `('developer','develop')` > `('xeveloper','xevelop')`

### `tokenSimilarity`
- both empty → 0
- identical token arrays → 1
- one token in common, others unrelated → fractional, normalised by `max(len)`
- substring overlap path triggers (`['developer']` vs `['develop']`) → 0.8 × ratio

### `ngramSimilarity`
- shorter than n → 0
- identical strings → 1
- partial overlap returns Jaccard ratio

### `calculateSimilarity`
- identical strings → 1.0
- completely different → low (< 0.2)
- LinkedIn-flavoured: `'Senior Frontend Developer'` vs `'Frontend Engineer Senior'` should land above default 0.3 threshold
- empty inputs → 0

### `findBestMatch`
- empty array → `null`
- empty `searchString` → `null`
- exactMatchData full-string match returns the matching key even if fuzzy score would lose
- exactMatchData first-word match used as secondary precedence
- threshold gating: low-similarity result returns `null`

### `matchesFilter`
- short word `'qa'` matches as whole word, not substring (`'aqua'` should NOT match `'qa'`)
- long word `'developer'` matches as substring (`'fullstack developer remote'`)
- empty `text` or empty `word` → `false`
- case-insensitive

### `checkIfAlreadyApplied`
- `'Applied 3 days ago'` → `true`
- `'Applied'` alone → `false` (lacks time word)
- `'I applied makeup hours ago'` → `true` (false-positive accepted to stay byte-for-byte with old logic — note in test)
- empty string → `false`

### `getJobLink`
- absolute URL passes through
- relative `/jobs/view/123/` → prefixed with `https://www.linkedin.com`
- `''` / `null` / no `href` → `''`

### `buildLinkedInJobUrl`
- `'12345'` → `'https://www.linkedin.com/jobs/view/12345/'`
- `null` → `''`
- numeric input coerced via template literal — confirm `123` works

### `appendApplyHistoryEntry` (extracted pure half)
- prepending preserves order (newest first)
- trims to `AA_HISTORY_LIMIT` when over
- accepts custom `limit` for tests
- never mutates the input array (returns new array)

### `getTime`
- always returns 5 zero-padded fields (`day/month/year/hour/minute` length 2)
- `year` is the 2-digit suffix
- mock `Date` to assert exact output for a known timestamp

---

## Out of scope for this plan

- `xpaths.js` is a pure constants file — port verbatim into `xpaths.ts` exporting string literals.
- Background-script + popup messaging contracts are owned by Phase 4.6 (already landed); this plan only references them.
- `recordApplyHistoryEntry`'s storage write path is part of `lib/storage.ts` (Phase 3) — only the data-shape transform is unit-tested here.
