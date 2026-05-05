<div align="center">

# Easy Apply LinkedIn

**Automate LinkedIn Easy Apply &nbsp;·&nbsp; Filter jobs your way &nbsp;·&nbsp; Track every attempt**

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Install-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/easyapplylinkedin/gncaadiobcdbnfnapjcjnpnibkgebfnk)
[![License: Non-commercial](https://img.shields.io/badge/License-Non--commercial-blue.svg)](LICENSE)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![WXT](https://img.shields.io/badge/Built%20with-WXT-FF7E1B)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)

</div>

---

A Chrome extension that walks LinkedIn's **Easy Apply** flow for you. Set the filters once — title must-contain / must-skip, bad words in the description, your CV picker — hit **Start**, and watch every attempt land in the Apply History page with a reason (`applied`, `titleSkip`, `badWord`, `submitNotConfirmed`, …) so nothing ever falls through the cracks.

Works on both LinkedIn UIs: legacy `/jobs/search/` and the new SDUI shadow-DOM `/jobs/search-results/`.

## Features

| | |
| :---: | :--- |
| 🎯 | **Smart filtering** — title must-contain / must-skip + bad-word scan over the job description |
| 📝 | **Form Control** — every question the bot has ever seen, answered once, reused forever |
| 📄 | **Multi-CV picker** — match a CV to the job by name (smart-select) or pin a default |
| 📊 | **Apply History** — full log with status / reason filters, search, CSV export, live updates |
| 🔗 | **Saved searches** — bookmark a LinkedIn search URL and run the bot against it in one click |
| 🛟 | **External Apply list** — jobs without Easy Apply get queued for you to handle manually |
| 🔍 | **Real submission verification** — only counts as `applied` after the "Application sent" modal is observed |

## Install

**Chrome Web Store** &nbsp;→&nbsp; [Easy Apply LinkedIn](https://chromewebstore.google.com/detail/easyapplylinkedin/gncaadiobcdbnfnapjcjnpnibkgebfnk)

**From source** (developer mode):

```sh
git clone <this-repo-url>
cd Chrome-linkedin-applier
pnpm install
pnpm build
```

Then in Chrome:

1. Open `chrome://extensions`
2. Toggle **Developer mode** (top-right)
3. Click **Load unpacked** and pick `.output/chrome-mv3`

## Quick start

1. Open the toolbar popup → fill in **Personal Information** and **Filter Settings**.
2. Navigate to a LinkedIn jobs search (`/jobs/search/` or `/jobs/search-results/`).
3. Click **Start Auto Apply**. Switch to **Apply History** to watch every skip and submission land with its reason.

## Development

```sh
pnpm dev          # WXT dev server with HMR (.output/chrome-mv3)
pnpm build        # production build
pnpm zip          # zip for Chrome Web Store
pnpm compile      # tsc --noEmit
pnpm test         # vitest run
pnpm lint         # eslint
```

The codebase is split across **typed wrappers** (`lib/storage.ts` and `lib/messaging.ts` are the single source of truth for storage keys and message contracts), **content-script modules** under `entrypoints/linkedin.content/` (DOM utils, modal helpers, form-fillers, run-state, run-script), and **React surfaces** for popup / settings / apply-history / external-apply / CV manager / form-control.

Storage namespacing follows `wxt/storage` defineItem with strict types in [`lib/types.ts`](lib/types.ts). Every UI- or behavior-affecting change requires a manual round in Chrome (see [`.claude/rules/04-verification.md`](.claude/rules/04-verification.md)).

## Tech stack

[WXT](https://wxt.dev) for MV3 + HMR &nbsp;·&nbsp; React 19 + TypeScript strict &nbsp;·&nbsp; Tailwind v4 + shadcn/ui &nbsp;·&nbsp; `wxt/storage` for typed storage &nbsp;·&nbsp; `@webext-core/messaging` for typed messaging &nbsp;·&nbsp; Vitest for unit/component tests &nbsp;·&nbsp; pnpm.

## Debugging

Every log line is prefixed with `[AutoApply]` and preserves its real call-site, so DevTools shows the actual `file:line` you can click straight to. To hide bot logs, type `-AutoApply` in the DevTools Console filter.

## Feedback

Bugs and feature requests on the repository's issues page.

## License

Personal and non-commercial use is free; commercial use requires written permission. See [LICENSE](LICENSE) for the full terms.
