# Running the apps

## Requirements

- Bun and Node.js at the versions pinned in [`mise.toml`](../mise.toml). With
  [mise](https://mise.jdx.dev/getting-started.html), `mise install` installs
  both. Expo's CLI runs on Node; bun installs packages and runs scripts.
- [Expo Go](https://expo.dev/client) on a phone, or an iOS simulator or Android
  emulator.

## Install and start

```bash
bun install
bun run --cwd apps/atomic start
```

`start` runs `expo start` and prints a QR code. Scan it with Expo Go. Press
<kbd>r</kbd> in the terminal to reload the app.

To start with an empty Metro cache:

```bash
bun run --cwd apps/atomic dev
```

## App scripts

Run these inside an app directory, or from the root with `--cwd apps/<name>`.

| Script          | Runs                                                           |
| --------------- | -------------------------------------------------------------- |
| `ios`           | `expo start --ios`                                             |
| `android`       | `expo start --android`                                         |
| `build`         | `expo export`, which bundles iOS, Android and web into `dist/` |
| `build-preview` | `eas build -p android --profile preview`                       |
| `doctor`        | `expo-doctor`, then `expo install --check`                     |

`bun run reset` at the root deletes every `node_modules` and `.expo` and
installs again.

`npx expo prebuild` generates `ios/` and `android/`, which are git-ignored.
`mise install` installs `eas` and `expo-doctor` at the versions in
[`mise.toml`](../mise.toml). `build` needs no Expo account. The checks (`lint`,
`fix`, `typecheck`, `test`, `check`) are in [Testing and checks](testing.md).

## Preview builds

[`apps/atomic/eas.json`](../apps/atomic/eas.json) defines three EAS Build
profiles: `development` (a development client, internal distribution), `preview`
(internal distribution) and `production` (auto-incrementing version). Building
needs an [Expo](https://expo.dev) account with access to the project.

## Resetting local data

The atomic app keeps its data in a SQLite database on the device. Clear the
app's storage, or uninstall the app, to return to onboarding. On the web, the
database lives in the browser's origin storage: clear the site data.
