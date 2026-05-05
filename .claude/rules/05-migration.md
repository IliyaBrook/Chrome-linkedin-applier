# Migration discipline

This is a **side-by-side migration**, not an in-place rewrite. The old project is the reference behavior. The new project is built next to it. Both are loaded in Chrome at the same time during development. Cutover only happens when feature parity is signed off by the user.

## Hard rules

1. **The old repo is read-only.** `D:\codding\My_projects\ChromeExtentions\autoApplylinkedin` is reference. Do not edit, do not commit to it, do not run its build, do not delete files in it. If you need to test old behavior, load the existing build into Chrome — don't change the source.

2. **The new extension must have a different ID** during development. WXT assigns one automatically when no `key` is set in the manifest. Keep it that way until cutover. This guarantees the two extensions cannot collide on `chrome.storage`.

3. **`(WXT dev)` suffix in the manifest name** during development. Makes it visually obvious which extension you're testing. Removed at cutover.

4. **Never auto-import old code.** Read the old code, understand it, then write fresh idiomatic React/TS. Copy-pasting old `chrome.storage.local.set` calls into TSX defeats the migration.

5. **`MIGRATION_AUDIT.md` is the spec.** When rewriting a feature, the audit row is the contract. If the audit is wrong, fix the audit first, then implement.

6. **`MIGRATION_PLAN.md` shrinks.** When a phase or sub-task is verified done, **delete** that block. The file should always be current TODO, not a history.

7. **Commit per sub-task.** Each commit moves one verifiable thing. Squashing later is fine; bundling unrelated work into one commit is not.

## Storage migration (Phase 6 only)

Until cutover, the new extension has its own storage namespace and starts from defaults. Do not write a one-shot migration shim until Phase 6. Don't worry about reading the old extension's storage during phases 2–5 — the user will manually re-enter settings in the new extension during parity testing.

When Phase 6 is reached:

- Aligning `manifest.key` with the old one will make the new build inherit the old extension's storage (same ID).
- A `chrome.runtime.onInstalled` listener in `background.ts` with `reason === 'update'` reads old keys and writes the new shape. One-shot, idempotent, logged.
- Test on a fresh profile with seeded old-shape storage before publishing.

## When in doubt

- "Should I add this convenience feature?" — Not unless the audit says the old one had it.
- "The old code does X this way, can I do it better?" — Yes, but the user-visible behavior must match. Improve the implementation, not the surface.
- "Should I update the old project too?" — No. Never.
