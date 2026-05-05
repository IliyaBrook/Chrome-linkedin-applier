# Manifest diff — old build vs WXT build

| Field | Old (`autoApplylinkedin/manifest.json` v2.2) | New (`pnpm build` output) | Verdict |
|---|---|---|---|
| `manifest_version` | `3` | `3` | match |
| `name` | `Easy Apply LinkedIn` | `Easy Apply LinkedIn (WXT dev)` | dev-only divergence — drop the `(WXT dev)` suffix at cutover. |
| `version` | `2.2` | `0.1.0` | new build is on its own version track; bump at cutover. |
| `description` | `Applying for Jobs Made Effortless!` | same | match |
| `permissions` | `["tabs","storage","activeTab","scripting"]` | same | match — no new permissions requested. |
| `host_permissions` | `["<all_urls>"]` | same | match — could narrow to `https://*.linkedin.com/*` later (the new content script only matches LinkedIn anyway), but keeping `<all_urls>` matches old behavior exactly. |
| `icons` | 16/48/128 → `assets/images/256256.png` (single 256×256 png) | 16/32/48/96/128 → `icon/<size>.png` (5 PNGs, all the 256×256 source) | superset — the new build adds the 32 and 96 slots that WXT defaults to. Same source image. |
| `action.default_icon` | mirrors `icons` | omitted in built output (Chrome falls back to top-level `icons`) | match (Chrome treats them identically). |
| `action.default_popup` | `popup/popup/popup.html` | `popup.html` | match (path differs because of WXT's flat output layout). |
| `action.default_title` | `CONFIGURATION` | `Easy Apply LinkedIn` | divergence — WXT pulls `default_title` from manifest name when not explicitly set. **Action**: set `manifest.action.default_title = 'CONFIGURATION'` in `wxt.config.ts` if exact parity matters. |
| `background.service_worker` | `background.js` | `background.js` (top-level) | match. |
| `background.type` | `module` | omitted (WXT's runtime handles it) | functionally equivalent. |
| `content_scripts[0].matches` | `["<all_urls>"]` | `["*://*.linkedin.com/*"]` | **narrowed** — new build only injects on LinkedIn (which is all the old script ever cared about anyway). Cleaner permission story for Web Store review. |
| `content_scripts[0].js` | `["content/utils.js","content/createElements.js","content/content.js","content/xpaths.js"]` | `["content-scripts/linkedin.js"]` | one bundled file vs four separately-loaded files (same effect). |
| `content_scripts[0].run_at` | `document_idle` | `document_idle` | match. |
| `web_accessible_resources` | `popup/**`, `assets/images/*`, `assets/**`, `modals/*` for `<all_urls>` | `content-scripts/linkedin.css` for `*://*.linkedin.com/*` | **dropped** — old build needed WAR for the modal HTML/CSS files because they were `fetch()`-injected into LinkedIn pages. New build mounts modals via `createShadowRootUi()` so only the bundled CSS needs WAR exposure. Smaller surface. |

## Net change

- **No new permissions requested.**
- **Tighter content-script and web-accessible-resources scope.**
- **Cosmetic name + title differences** that get reconciled at cutover.

The new manifest is a strict subset of the old one in terms of capabilities and a strict superset only in icon-size slots (which are harmless).
