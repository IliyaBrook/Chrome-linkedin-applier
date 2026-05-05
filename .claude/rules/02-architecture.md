# Architecture

## Folder layout

```
entrypoints/
  background.ts            # defineBackground(() => { ... })
  popup/
    index.html
    main.tsx
    App.tsx
  options/                 # if old project has an options page
    index.html
    main.tsx
    App.tsx
  <name>.content.ts        # one file per content script entry
components/
  ui/                      # shadcn primitives (copied via shadcn CLI, do not hand-edit unless customizing)
  <feature>/               # feature-grouped composed components
hooks/
  useStorage.ts
  useActiveTab.ts
  ...
lib/
  storage.ts               # typed wrapper — every storage access goes through here
  messaging.ts             # typed wrapper — every message goes through here
  types.ts                 # shared types (Job, FilterSettings, etc.)
  utils.ts                 # cn(), small pure helpers
  constants.ts             # storage keys, message names, URLs
public/
  icons/
  _locales/                # if i18n is used
assets/
  tailwind.css
```

## Boundaries

- **`lib/`** is pure: no React, no DOM. Modules here can be imported by any layer.
- **`hooks/`** is React-only. They wrap `lib/` modules with React state/effects.
- **`components/`** depends on `hooks/` and `lib/`, never on `entrypoints/`.
- **`entrypoints/`** wires everything together. It can depend on anything but should be thin.
- **`background.ts`** is stateless across invocations. All state lives in `chrome.storage` or `chrome.alarms`. No top-level mutable variables.

## Content scripts

For any UI injected into LinkedIn pages, use `defineContentScript({ ..., cssInjectionMode: 'ui' })` and mount React inside a Shadow DOM via `createShadowRootUi()`. This isolates Tailwind from page styles. Never mutate the host page's DOM directly except inside the shadow root or for navigation/click triggers.

## State management

- **Per-component state**: `useState`.
- **Cross-component but in one entrypoint**: Context, or lift state up.
- **Cross-entrypoint persistent state**: `chrome.storage` via `lib/storage.ts` (with `useStorage` hook for reactive reads).
- **Heavy/computed state across components in one tree**: Zustand only if the prop-drilling is genuinely painful — three levels is not painful, eight is.

## Imports

- Absolute via `@/*` for cross-folder imports (`@/lib/storage`, `@/components/ui/button`).
- Relative only for siblings (`./App`, `./types`).
- No circular imports. If you find one, restructure — don't paper over with `import type` only.

## Files = exports

- One default export per file is fine for components.
- For `lib/` modules, prefer named exports for tree-shaking and discoverability.
- Re-export barrels (`index.ts`) only when there's a real consumer benefit. Don't auto-add them.
