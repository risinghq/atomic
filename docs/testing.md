# Testing and checks

CI runs `bun run check` on every pull request
([`ci.yml`](../.github/workflows/ci.yml)). Run the same script locally at the
root. It runs `lint` over the whole repository, then `typecheck`, `test` and
`build` in every workspace, and writes only the git-ignored `dist/` folders:

```bash
bun run check
```

`bun run fix` applies the safe oxlint fixes and formats every file.

## Tests

`bun run test` runs each workspace's `test` script, which is `vitest run`. It
finds every `*.test.ts` and `*.test.tsx` in that workspace and exits non-zero if
one fails.

One workspace, one file or one directory:

```bash
bun run --cwd apps/atomic test
cd apps/atomic && bunx vitest run src/utils
cd apps/atomic && bunx vitest run src/hooks/useTransactions.test.tsx
```

Layout in the atomic app:

- Tests sit beside the file they cover: `src/utils/money.test.ts`,
  `src/api/budgetService.test.ts`, `src/hooks/useBudget.test.tsx`.
- Screen tests live in [`tests/screens/`](../apps/atomic/tests/screens).
- A test that renders React starts with `// @vitest-environment jsdom`. The
  default environment is Node.
- Tests that render screens or navigators replace `react-native` with plain DOM
  elements. Tests that touch storage replace
  `@react-native-async-storage/async-storage` with an in-memory `Map`, and
  `expo-crypto` with a stub id generator, because its native module does not
  load under jsdom.
- `@/` resolves to `src/` in tests, as in the app
  ([`vitest.config.mts`](../apps/atomic/vitest.config.mts)).

## Lint and format

`bun run lint` runs `oxlint --deny-warnings` and then `oxfmt --check` over the
whole repository. It exits non-zero on any lint diagnostic or unformatted file,
including Markdown, YAML and JSON.

```bash
bun run lint
bun run fix
```

Rules are in [`.oxlintrc.json`](../.oxlintrc.json) and formatting options are in
[`.oxfmtrc.json`](../.oxfmtrc.json). Markdown, YAML and JSON wrap at 80 columns.

## Type check

`bun run typecheck` runs `tsc --noEmit` in each workspace, with `strict` on.
