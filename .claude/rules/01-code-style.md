# Code style

## No comments

Default to writing zero comments. Identifiers and structure must carry the meaning. The only justified comment is one explaining a non-obvious **why** — a hidden constraint, a workaround for a specific browser bug, a subtle invariant. If removing the comment wouldn't confuse a future reader, remove it.

Never write:
- comments restating what the code does (`// fetch user`)
- task/PR references in code (`// added for issue #123`)
- multi-line block comments or paragraph docstrings
- `// TODO` without a tracked entry — put it in an issue or a note, not in source

## English only

Every identifier, string literal, JSX text, log message, error message, and commit message is in English. The codebase has no Russian/Hebrew/etc. text in source. User-facing UI strings live in `_locales/` (or `@wxt-dev/i18n`) — even there, keys are English; values are localized.

## Naming

- React components: `PascalCase` (`FilterSettingsPanel`)
- Files for components: `PascalCase.tsx` matching the component name
- Hooks: `useThing` in `hooks/useThing.ts`
- Utility modules: `kebab-case.ts` or `camelCase.ts` (be consistent within `lib/`)
- Types and interfaces: `PascalCase`, no `I`-prefix
- Storage keys: `SCREAMING_SNAKE_CASE` constants exported from `lib/storage.ts`
- Message names: `SCREAMING_SNAKE_CASE` constants exported from `lib/messaging.ts`

## Formatting

- 2-space indent, no tabs
- Single quotes for strings, double quotes only inside JSX attributes
- Trailing commas where valid
- Prettier defaults; ESLint with TypeScript strict + React rules
- No semi-colon religion — let Prettier decide and stick to it

## Tailwind only

- All styling via Tailwind utility classes
- No inline `style={{ ... }}` (exception: dynamic values that genuinely cannot be expressed as a class — color from a variable, computed pixel offset; document the exception with a one-line comment)
- No standalone `.css` files for component styling. Only `assets/tailwind.css` with `@import "tailwindcss";` and any `@layer base/components/utilities` overrides.
- Use `cn()` from `lib/utils.ts` (provided by shadcn) to merge conditional classes.

## TypeScript

- `strict: true` in `tsconfig.json`. No `any` without explicit comment justifying.
- Prefer `type` aliases over `interface` unless extending a class or augmenting a third-party module.
- Path alias `@/*` → repo root.
- Discriminated unions for message payloads; no untyped `unknown` shuffling.
