# Storage and messaging wrappers

The single most common source of bugs in extensions is ad-hoc `chrome.storage` and `chrome.runtime.sendMessage` calls scattered across files. This project enforces wrappers.

## Storage — `lib/storage.ts`

**Rule**: every read or write of `chrome.storage.*` (local or sync) goes through `lib/storage.ts`. UI code, hooks, content scripts, background — all use the same wrapper.

The wrapper is built on `wxt/storage`. Each storage key:

- has a typed value
- has a default
- has an optional watcher API
- has its key string declared **once** as an exported constant

Sketch:

```ts
import { storage } from 'wxt/storage';

export const FILTER_SETTINGS_KEY = 'local:filterSettings' as const;

export type FilterSettings = {
  titleIncludes: string[];
  titleExcludes: string[];
  // ...
};

export const filterSettingsStorage = storage.defineItem<FilterSettings>(
  FILTER_SETTINGS_KEY,
  {
    fallback: {
      titleIncludes: [],
      titleExcludes: [],
    },
  },
);
```

**Forbidden**:
- `chrome.storage.local.get/set` directly anywhere outside `lib/storage.ts`
- duplicating storage key strings in multiple files
- introducing a new key without a `defineItem` declaration in `lib/storage.ts` and a type in `lib/types.ts` (or co-located)

**React access**:
- Use the `useStorage` hook (provided by `wxt/storage` or wrap your own) for reactive reads.
- Never combine `useEffect` + manual `getValue` if the hook exists.

## Messaging — `lib/messaging.ts`

**Rule**: every `chrome.runtime.sendMessage`, `chrome.tabs.sendMessage`, or `chrome.runtime.connect` goes through `lib/messaging.ts`. Use `@webext-core/messaging` (or `@webext-core/proxy-service` for RPC-style background calls).

Sketch:

```ts
import { defineExtensionMessaging } from '@webext-core/messaging';

interface ProtocolMap {
  startApply(data: { filters: FilterSettings }): { runId: string };
  stopApply(): void;
  getStatus(): { running: boolean; appliedCount: number };
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
```

**Forbidden**:
- `chrome.runtime.sendMessage(...)` directly outside `lib/messaging.ts`
- string literals for message types in multiple files
- adding a new message without extending `ProtocolMap`

## Why this matters

- TypeScript catches stale message names and stale payload shapes at compile time
- Refactoring a key or message name becomes a single-file change
- New developers (and you in 6 months) can find every storage/message touchpoint with one find-references
- The migration parity check becomes mechanical: each old `chrome.storage.local.get('x')` maps to one `defineItem` and one `useStorage` call

If you're tempted to bypass a wrapper "just this once" — don't. Add the missing entry to the wrapper.
