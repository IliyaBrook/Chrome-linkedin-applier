# Easy Apply LinkedIn — Chrome extension

A Chrome MV3 extension that automates LinkedIn Easy Apply flows: iterates the jobs list, applies title / company / bad-word filters, fills the application form from saved configs, picks the right CV (with smart-select), and records every attempt to a local apply-history log.

Built on **WXT + React 18 + TypeScript (strict) + Tailwind v4 + shadcn/ui**. Typed storage via `wxt/storage`, typed messaging via `@webext-core/messaging`. Package manager: **pnpm**.

> Topical conventions live in [`.claude/rules/`](.claude/rules) — code style, architecture, wrappers, verification.

## Critical rules

1. **No code comments.** Identifiers and structure carry the meaning. Only justify a comment with a non-obvious *why*. (See [`.claude/rules/01-code-style.md`](.claude/rules/01-code-style.md).)
2. **English only** for identifiers, strings, JSX text, log/error messages, and commit messages.
3. **Storage and messaging only through typed wrappers** — `lib/storage.ts` and `lib/messaging.ts`. No direct `chrome.storage.*` or `chrome.runtime.sendMessage` from UI / hooks / content code. (See [`.claude/rules/03-wrappers.md`](.claude/rules/03-wrappers.md).)
4. **Tailwind only** for styling. No inline `style={{ ... }}` (rare exceptions for genuinely dynamic values, with a one-line justification). No standalone `.css` files for component styling — only `assets/tailwind.css`.
5. **Manual verification after every UI- or behavior-affecting change.** Type-checks and tests prove the code compiles; they do not prove the extension works. Load unpacked in Chrome and exercise the golden path + one edge case. (See [`.claude/rules/04-verification.md`](.claude/rules/04-verification.md).)
6. **Strict TypeScript, no `any`** without an explicit one-line justification. Path alias `@/*` → repo root. Discriminated unions for message payloads.

## Tech stack

- **WXT** — extension framework (handles MV3 manifest generation, HMR, multi-browser builds)
- **React 18** + **TypeScript** (strict)
- **Tailwind v4** via `@tailwindcss/vite` + `@wxt-dev/module-react`
- **shadcn/ui** primitives copied into `components/ui/` (owned by the project)
- **`@webext-core/messaging`** for typed messaging
- **`wxt/storage`** for typed storage with defaults and watchers
- **vitest** for unit tests, **happy-dom** for component tests
- **pnpm** as package manager

## Folder layout

```
entrypoints/
  background.ts                 # service worker — onMessage handlers + storage migration shim
  popup/                        # toolbar action
  apply-history/, cv-manager/, external-apply/, filter-settings/,
  form-control/, settings/      # full-page extension surfaces
  linkedin.content/             # content-script bundle:
    index.tsx                   # mounts ModalRoot + binds window.runScript
    dom-utils.ts                # XPath / click / setNativeValue / autocomplete
    loaders.ts                  # waitForLoaderToDisappear, blinking border
    modals.ts                   # Easy-Apply / SDUI / save-application modal helpers
    linkedin-dom.ts             # detectJobsUI, getJobItems, pagination
    save-modal.ts               # save-application-modal handler + 2 s monitor
    run-state.ts                # ContentRunState — single mutable state object
    form-fillers.ts             # input/checkbox/radio/dropdown/CV-pick + validations
    run-script.ts               # runScript / runApplyModel / runFindEasyApply / clickJob
components/
  ui/                           # shadcn primitives
  popup/, page/, content-modals/, …  # composed feature components
hooks/
  useStorage.ts, useActiveTab.ts
lib/
  storage.ts                    # typed storage items — single source for keys + defaults
  messaging.ts                  # typed messaging — single source for ProtocolMap
  types.ts                      # shared types (ApplyHistoryEntry, JobsUI, …)
  fuzzy-match.ts                # findBestMatch, findClosestField, levenshtein, …
  text-filters.ts               # matchesFilter, checkIfAlreadyApplied
  apply-history.ts              # appendApplyHistoryEntry, recordApplyHistoryEntry
  storage-migration.ts          # pure pruners used by background's onInstalled shim
  xpaths.ts, constants.ts, time-format.ts, linkedin-urls.ts, utils.ts
public/
  icon/
```

## Development

```sh
pnpm dev          # WXT dev server with HMR — output in .output/chrome-mv3
pnpm build        # production build
pnpm zip          # zip for Chrome Web Store
pnpm compile      # tsc --noEmit
pnpm test         # vitest run
pnpm lint         # eslint . --ext .ts,.tsx
```

After loading unpacked in Chrome (`chrome://extensions` → Developer mode → Load unpacked → `.output/chrome-mv3`), the toolbar icon opens the popup. The content script auto-injects on `*.linkedin.com` and binds `window.runScript` to the auto-apply orchestrator so the background's `executeScript` trigger can start a run.
