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
cd packages/core && bunx vitest run tests/period.test.ts
cd apps/atomic && TZ=America/Lima bunx vitest run tests/app.test.tsx
```

Layout in the atomic app:

- Tests live in [`tests/`](../apps/atomic/tests). `app.test.tsx` drives the real
  screens: onboarding, adding and deleting an entry, creating a budget, the CSV
  export and erasing the data. It mocks `shareCsv`, which needs the Expo
  runtime. `format.test.ts` covers the labels in `src/format.ts`, and
  `csv.test.ts` the CSV in `src/data/csv.ts`.
- The tests render through react-native-web under jsdom
  ([`vitest.config.mts`](../apps/atomic/vitest.config.mts)), so they query the
  DOM by role and label.
- [`tests/render.tsx`](../apps/atomic/tests/render.tsx) opens a real store on
  `memoryDatabase` from `@atomic/core/testing` and wraps a screen in the theme,
  toast and data providers.
- The `test` script pins `TZ=America/Lima`, because day and period labels depend
  on the local time zone.

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
