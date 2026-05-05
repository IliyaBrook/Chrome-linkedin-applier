# Verification

Type-checks and lints prove the code compiles. They do **not** prove the extension works. Every UI- or behavior-affecting change requires a manual round in Chrome.

## Loop after each meaningful change

1. `pnpm dev` (WXT dev server with HMR) **or** `pnpm build` then load unpacked
2. Open Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → `.output/chrome-mv3` (dev) or `.output/chrome-mv3-prod`
3. Open the popup / extension page / target LinkedIn page and reproduce the change you made
4. Check the **golden path** for the feature
5. Check at least one **edge case** for the feature (empty state, error state, very large input, etc.)
6. Check a **neighbour feature** that touches the same storage key or message — regressions like to hide there
7. Open DevTools → Console tab for both the popup and the page; no red errors
8. Open `chrome://extensions` → service worker logs; no red errors

If you can't open Chrome / can't run the extension in this environment, **say so explicitly** in the response. Do not claim "works as expected" based on type-checks alone. The user accepts "I implemented X; type-check passes; please load and verify Y, Z" — they do not accept silent assumptions.

## Permissions discipline

Every time the manifest changes, diff against the prior committed manifest. If the build asks for a permission it didn't before, justify it in the commit message **or** remove it. Reviewers (the user, future you, the Web Store) will ask.

## What "done" means

A change is done when:
- code compiles, lints, type-checks
- vitest suite passes (`pnpm test`)
- it has been **loaded in Chrome** and the golden path exercised
- one edge case has been exercised
- a commit captures the change with a clear English message

Not before.
