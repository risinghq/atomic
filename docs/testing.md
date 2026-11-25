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

`bun run test` runs each workspace's `test` script and exits non-zero if a test
fails. `apps/atomic` and `packages/ui` run Jest with the `jest-expo` preset
([`jest.config.js`](../apps/atomic/jest.config.js)). `packages/core` holds no
React Native code and runs Vitest. `apps/api` runs Vitest inside workerd against
a local D1; its tests replace only the Google and GitHub servers (see
[API](api.md)).

One workspace, one file or one directory:

```bash
bun run --cwd apps/atomic test
cd packages/core && bunx vitest run tests/period.test.ts
cd apps/atomic && TZ=America/Lima bunx jest tests/app.test.tsx
```

The React Native tests act as a user. They render components with
[React Native Testing Library](https://callstack.github.io/react-native-testing-library/),
find elements by role, label or visible text, as a screen reader would, and
press and type through `userEvent`. They assert what the user sees and what the
store holds, not styles or props. They mock no module: `jest-expo` replaces each
Expo native module with a recorder, and a test reads that recorder. The account
tests also give three recorders real behaviour (an in-memory keystore, a browser
that signs in, and SHA-256) and replace `fetch`, the one network boundary, with
an in-memory Worker.

Layout in the atomic app:

- Tests live in [`tests/`](../apps/atomic/tests). `app.test.tsx` drives the real
  screens: onboarding, adding and deleting an entry, creating a budget, the CSV
  export and erasing the data. The export test reads the file handed to the
  share sheet. `format.test.ts` covers the labels in `src/format.ts`, and
  `csv.test.ts` the CSV in `src/data/csv.ts`. `account.test.tsx` covers sign-in,
  sync, sign-out, account deletion and erasing while signed in.
- [`tests/cloud.ts`](../apps/atomic/tests/cloud.ts) holds `FakeCloud`, the
  Worker's contract from [API](api.md) in memory: PKCE sign-in, the newer record
  wins, paged pulls and the delete routes. A test sets `online`,
  `dropsAfterSignIn`, `pageSize`, `signingInAs` or `providersSetUp` to shape
  what the app meets.
- [`tests/render.tsx`](../apps/atomic/tests/render.tsx) opens a real store on
  `memoryDatabase` from `@atomic/core/testing` and wraps a screen in the theme,
  toast, data and account providers.
- The `test` script pins `TZ=America/Lima`, because day and period labels depend
  on the local time zone.

## End-to-end flows

[Maestro](https://docs.maestro.dev) flows in
[`apps/atomic/.maestro/`](../apps/atomic/.maestro) drive the installed Android
app on a device or emulator. They cover what Jest cannot: the release build,
Hermes, native gestures and real animations. Each flow clears the app's data
first.

Install the Maestro CLI, install a build of the app on a running emulator, then
run every flow:

```bash
curl -fsSL https://get.maestro.mobile.dev | bash
bun run --cwd apps/atomic build-preview
adb install -r atomic.apk
bun run --cwd apps/atomic e2e
```

`build-preview` builds the APK on EAS and prints its download link; save it as
`atomic.apk`. `bun run check` does not run these flows.

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
