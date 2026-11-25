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

| Script          | Runs                                                          |
| --------------- | ------------------------------------------------------------- |
| `ios`           | `expo run:ios`, a native build on a simulator                 |
| `android`       | `expo run:android`, a native build on an emulator or device   |
| `apk`           | a release APK for x86_64 emulators, built locally with Gradle |
| `emulator`      | starts the headless test emulator, creating it on first use   |
| `build`         | `expo export --platform web` into `dist/`                     |
| `build-preview` | `eas build -p android --profile preview`                      |
| `doctor`        | `expo-doctor`, then `expo install --check`                    |

`bun run reset` at the root deletes every `node_modules` and `.expo` and
installs again.

`npx expo prebuild` generates `ios/` and `android/`, which are git-ignored.
`mise install` installs `eas`, `expo-doctor`, the JDK, Google's
[Android CLI](https://developer.android.com/tools/agents/android-cli) and
Maestro at the versions in [`mise.toml`](../mise.toml). mise sets `ANDROID_HOME`
to `~/Android/Sdk` unless it is already set; `emulator` installs the SDK
packages it needs there. `build` needs no Expo account. The checks (`lint`,
`fix`, `typecheck`, `test`, `check`) are in [Testing and checks](testing.md).

## Preview builds

[`apps/atomic/eas.json`](../apps/atomic/eas.json) defines three EAS Build
profiles: `development` (a development client, internal distribution), `preview`
(internal distribution) and `production` (auto-incrementing version). Building
needs an [Expo](https://expo.dev) account with access to the project.

Android release builds run R8 and shrink unused resources. The
`expo-build-properties` entry in [`app.json`](../apps/atomic/app.json) sets
both.

## Resetting local data

The atomic app keeps its data in a SQLite database on the device. **Borrar todos
los datos** in Ajustes erases it and returns to onboarding. Clearing the app's
storage, or the site data on the web, also removes the database file.
