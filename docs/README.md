# Manual

1. [Running the apps](running.md): install, start the dev server, run on a
   device or emulator, make a preview build.
2. [Repository layout](architecture.md): the workspaces and what each may
   import.
3. [Testing and checks](testing.md): the test, lint and type-check commands and
   how the tests are laid out.
4. [UI](ui.md): the shared theme and components in `@rising/ui`, and the catalog
   app that shows them.
5. [Core](core.md): the data model, money and period math, and the SQLite store
   in `@rising/core`, with its migrations and the AsyncStorage import.
6. [API](api.md): the Worker that signs people in and syncs their records, and
   how it deploys.

The atomic app has its own manual:

1. [Architecture](../apps/atomic/docs/architecture.md): the code map, the tabs
   and the boundaries between them.
2. [Data flow](../apps/atomic/docs/data-flow.md): how the app starts, and how an
   entry travels from the number pad to the store and every screen.

[CONTRIBUTING.md](../.github/CONTRIBUTING.md) covers sending a change.
