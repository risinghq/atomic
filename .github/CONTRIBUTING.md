# Contributing

Thank you for considering a contribution to atomic.

## The codebase

[Repository layout](../docs/architecture.md) lists the workspaces and what each
may import. In the atomic app,
[Architecture](../apps/atomic/docs/architecture.md) maps the code: screens go in
`app/`, data loading in `src/hooks/`, rules over stored data in `src/api/`, and
storage access in `src/services/storageService.ts`. The architecture page also
lists the [boundaries](../apps/atomic/docs/architecture.md#boundaries) a change
must keep.

## Set up

Follow [Running the apps](../docs/running.md) to install dependencies and start
the dev server.

## Make a change

1. Branch from `master`.
2. Add or update a test next to the file you change. See
   [Testing and checks](../docs/testing.md).
3. Run the check CI runs, at the repository root:

   ```bash
   bun run check
   ```

   `bun run fix` fixes the lint and formatting problems it can.

4. Open a pull request against `master`. CI runs `bun run check`.

## Conventions

- Interface text is Spanish. Code, comments and documentation are English.
- Add a dependency with `bun add` inside the workspace that imports it.
- In the atomic app, import from `src/` with the `@/` alias. Style with
  NativeWind class names, and combine conditional classes with `cn` from
  [`src/utils/cn.ts`](../apps/atomic/src/utils/cn.ts).
- Commit subjects read `area: what changed`, such as
  `hooks: reload transactions when the user changes`.
- Markdown is formatted by `oxfmt`, which `bun run lint` checks.
- Each fact lives in one document. Link to it instead of copying it.
