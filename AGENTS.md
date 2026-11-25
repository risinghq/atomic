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

- Import from `src/` with `@/`.
- Only `src/services/storageService.ts` imports AsyncStorage.
- Screens in `app/` use hooks. They do not import `src/api` or `src/services`.
- Read and write the current user through `useUser()`.
- Sum and subtract money with `src/utils/money.ts`.
