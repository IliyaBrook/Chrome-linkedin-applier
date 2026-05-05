# Easy Apply LinkedIn — WXT Migration

This repo is the migration target for the Chrome extension **Easy Apply LinkedIn** (currently shipped as v2.2 from `D:\codding\My_projects\ChromeExtentions\autoApplylinkedin`). The plain HTML/JS/CSS extension is being rewritten on **WXT + React + TypeScript + Tailwind + shadcn/ui**.

The two repos live side-by-side until full feature parity. Until then, the old repo is the authoritative spec for behavior — read it, don't modify it.

## Where to look first

- [`MIGRATION_PLAN.md`](MIGRATION_PLAN.md) — the active roadmap. Always start here to see the current phase and next deliverable. Completed sections are **removed** from this file (not crossed out), so the file shrinks as the migration progresses.
- [`MIGRATION_AUDIT.md`](MIGRATION_AUDIT.md) — produced in Phase 1. Catalog of the old extension's manifest, entrypoints, Chrome APIs, storage schema, messaging contracts, assets, and feature checklist. Single source of truth for what the new version must reproduce.
- [`.claude/rules/`](.claude/rules) — topical conventions (code style, architecture, wrappers, verification, migration discipline).

## Critical rules

1. **Do not modify the old project.** `D:\codding\My_projects\ChromeExtentions\autoApplylinkedin` is read-only until the user explicitly says cutover. No exceptions, even for "small fixes."
2. **Old project = behavioral spec.** When a feature in the new code looks ambiguous, the answer comes from the old code, not from your imagination.
3. **`MIGRATION_PLAN.md` is mutable.** When a phase or sub-task lands, **delete** that section from the file. Don't leave checked boxes or strikethrough — the file should always show only what's still TODO.
4. **One phase at a time.** Don't jump ahead. Don't refactor outside the current phase's scope.
5. **No code comments.** Identifiers, strings, and commit messages are English. (See [`.claude/rules/01-code-style.md`](.claude/rules/01-code-style.md).)
6. **Storage and messaging only through typed wrappers** (`lib/storage.ts`, `lib/messaging.ts`). No direct `chrome.storage.*` or `chrome.runtime.sendMessage` from UI code. (See [`.claude/rules/03-wrappers.md`](.claude/rules/03-wrappers.md).)
7. **Tailwind only.** No inline styles, no separate `.css` files for component styling. Global Tailwind layer + shadcn/ui tokens.
8. **Manual verification after every UI change.** Load unpacked in Chrome, run through the parity checklist for the feature touched. (See [`.claude/rules/04-verification.md`](.claude/rules/04-verification.md).)

## Tech stack

- **WXT** — extension framework (handles MV3 manifest generation, HMR, multi-browser builds)
- **React 18** + **TypeScript** (strict)
- **Tailwind v4** via `@wxt-dev/module-tailwindcss`
- **shadcn/ui** for components (copied into `components/ui/`, owned by the project)
- **`@webext-core/messaging`** for typed messaging
- **`wxt/storage`** for typed storage with defaults and watchers
- **pnpm** as package manager (note: old project uses yarn — new one uses pnpm because WXT recommends it and it's faster)

## Folder layout (target — established in Phase 2)

```
entrypoints/
  background.ts
  popup/
  options/
  content/         # if needed per audit
components/
  ui/              # shadcn primitives
  <feature>/       # composed feature components
hooks/             # useStorage, useActiveTab, ...
lib/
  storage.ts       # typed wrapper, single source for keys + defaults
  messaging.ts     # typed wrapper, single source for message contracts
  types.ts         # shared types
  utils.ts         # cn(), small helpers
public/
  icons/
```

## Old project reference

- Location: `D:\codding\My_projects\ChromeExtentions\autoApplylinkedin`
- Manifest version: 3
- Stack: vanilla HTML/CSS/JS, jQuery-free, MV3 service worker
- Key entry: `popup/popup/popup.html` (action popup), `background.js` (service worker), `content/{utils,createElements,content,xpaths}.js` (content scripts on `<all_urls>`)
- Permissions: `tabs`, `storage`, `activeTab`, `scripting`, `host_permissions: <all_urls>`

## Workflow contract

1. Read `MIGRATION_PLAN.md` to find the active phase.
2. If the phase has multiple sub-tasks, work the first one. Don't batch.
3. After each sub-task: run/verify, then delete that sub-task block from `MIGRATION_PLAN.md`.
4. Commit after each verified sub-task. Concise commit message in English.
5. If you discover something the audit missed, update `MIGRATION_AUDIT.md` first, then continue.
