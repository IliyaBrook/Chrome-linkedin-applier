# shadcn/ui

UI primitives in `components/ui/` are shadcn (style `new-york`, baseColor `slate`, lucide icons — see [`components.json`](../../components.json)). The project has the official **shadcn MCP server** wired in [`.mcp.json`](../../.mcp.json). When the MCP is loaded in the session, **use it** — your training data is almost always stale relative to the current shadcn registry.

## Adding or upgrading primitives

- **Use the shadcn MCP** for any add / lookup / browse action against the registry. The MCP exposes canonical, up-to-date sources for components and blocks.
- If for some reason the MCP is unavailable, fall back to the CLI: `pnpm dlx shadcn@latest add <name>`. Don't paste sources from memory or other sites.
- **Never hand-roll a Radix-based primitive** when shadcn ships one. Examples that aren't in `components/ui/` yet but should be generated through shadcn if needed: `Table`, `Tabs`, `Tooltip`, `ScrollArea`, `Separator`, `Sheet`, `DropdownMenu`, `Popover`.
- **Don't hand-edit copied primitives** unless you are intentionally customizing. Document any customization with a one-line comment so it survives future re-syncs.

## Composing feature components

- **Reuse before adding.** Before writing a new feature component, check `components/ui/` for a primitive that fits. The current set covers most needs (`Button`, `Card` family, `Dialog` family, `Input`, `Label`, `Select` family, `Switch`).
- **Don't reinvent the look.** Manual `<table>`, `<dialog>`, `<nav>`, etc. with shadcn-style Tailwind classes drifts from the design tokens and breaks the next time tokens change. If you need a new pattern, generate the matching shadcn primitive first, then compose.
- **Stick to design tokens.** Use the shadcn token classes (`bg-muted`, `text-muted-foreground`, `border-border`, `ring-ring`, `bg-accent`, …) and the `cn()` helper from [`lib/utils.ts`](../../lib/utils.ts). Tokens come from `assets/tailwind.css` and `:host`-scoped CSS variables in content-script bundles.

## Icons

- Use `lucide-react` — it's the configured icon library in `components.json`.
- Don't introduce another icon pack without a reason; if you do, add a one-line comment explaining why.
