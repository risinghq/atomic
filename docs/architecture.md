# Repository layout

atomic is a [bun workspace](https://bun.sh/docs/install/workspaces). Each app
under `apps/` is an Expo app. Code that more than one app uses lives in a
package under `packages/`.

| Workspace                       | Package  | Owns                                                       |
| ------------------------------- | -------- | ---------------------------------------------------------- |
| [`apps/atomic`](../apps/atomic) | `atomic` | The expense tracker. Its manual is in `apps/atomic/docs/`. |

## Rules

- An app may import a package. A package never imports an app.
- An app never imports another app.
- A dependency goes in the `package.json` of the workspace that imports it. The
  root `package.json` holds only the repository tools (`oxlint`, `oxfmt`).
- Every workspace with code defines `typecheck`, `test` and `build` scripts. The
  root scripts run them in every workspace that has them.

## Installing

`bun install` at the root installs every workspace into one hoisted
`node_modules` ([`bunfig.toml`](../bunfig.toml)). Metro resolves packages from
there, and Expo finds the workspace root by itself, so the apps need no Metro
workspace settings.
