# AGENTS.md

- Use bun. Before finishing, run `bun run fix`, then `bun run check` at the
  repository root. Both must pass.
- Add a dependency with `bun add` in the workspace that imports it.
- Format Markdown and TypeScript with `oxfmt`. Do not use Prettier.
- Interface text is Spanish. Code, comments and documentation are English.
- A package under `packages/` never imports an app under `apps/`.
- A new or changed component in `packages/ui` gets a demo in `apps/catalog` and
  a row in `docs/ui.md`.

In `apps/atomic`:

- Read data with `useData()` and change it through its `write`. Only
  `src/data/openAppStore.ts` opens the database.
- Keep money in integer cents. Convert with `fromCents` only where a ui
  component takes the amount.
- Build screens from `@rising/ui` components and theme values.
