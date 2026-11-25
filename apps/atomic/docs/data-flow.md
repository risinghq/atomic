# Data flow

## Start

1. [`App`](../src/App.tsx) keeps the splash screen up and calls
   [`openAppStore`](../src/data/openAppStore.ts).
2. `openAppStore` opens `atomic.db` with expo-sqlite and runs the migrations. It
   then imports what the AsyncStorage version of the app left
   ([Core](../../../docs/core.md#the-asyncstorage-import)) and seeds the default
   categories on a new install.
3. [`DataProvider`](../src/data/DataProvider.tsx) loads the snapshot: every
   category (archived ones included), the transactions, the budgets and the
   settings. It renders nothing until the snapshot is loaded.
4. [`AccountProvider`](../src/account/AccountProvider.tsx) reads the session
   from the keystore and, when there is one, starts a sync.
5. [`Root`](../src/Root.tsx) shows `Onboarding` while `settings.onboarded` is
   false. **Empezar** saves the chosen currency and week start with
   `onboarded: true`, and the reloaded snapshot switches `Root` to the shell.
   Signing in from onboarding instead keeps the account's currency and week
   start when the account already holds data.

## Adding an expense

```text
Agregar ─► EntryForm ─► write(store => store.addTransaction(...))
                              │
                              └─► load(store) ─► snapshot ─► every screen
```

1. **Agregar** in the tab bar opens the entry sheet in
   [`Shell`](../src/Shell.tsx). `useSheet` gives the form a new key on each
   open, so it starts empty.
2. [`EntryForm`](../src/entry/EntryForm.tsx) reads the amount from the number
   pad as cents with `parseCents`. **Confirmar** moves to the note and the
   category picker.
3. Picking a category saves. The form calls
   `write((store) => store.addTransaction(...))`, or `updateTransaction` when it
   edits one, closes the sheet and shows a toast.
4. `write` runs the change, then reloads the whole snapshot. Every screen
   renders from the new snapshot, so the log, the totals and the budgets agree.

Deleting and budgets take the same path: a long press opens a confirm sheet, and
**Borrar** calls `write` with `deleteTransaction` or `deleteBudget`.
[`BudgetForm`](../src/budgets/BudgetForm.tsx) saves with `setBudget`, which
replaces the budget that category had.

## Categories

**Categorías** in Ajustes lists the categories of one kind.
[`CategoryForm`](../src/categories/CategoryForm.tsx) saves a new one with
`addCategory`, which places it last, and an edit with `updateCategory`.
Archiving sets `archived`: the category leaves the entry and budget pickers, and
its transactions keep it. Restoring clears the flag. A kind keeps at least one
active category, so the form offers no **Archivar** for the last one.

## Settings

Ajustes writes a change with `updateSettings` as soon as a segment is picked.
The currency formats every amount. The week start moves every week period, in
Resumen and in weekly budgets.

**Exportar CSV** builds the file with [`toCsv`](../src/data/csv.ts): one row per
transaction, oldest first, with the date, `gasto` or `ingreso`, the category,
the note and the amount with a dot decimal. The file starts with a UTF-8 byte
order mark so Excel reads the accents. On iOS and Android,
[`shareCsv`](../src/data/shareCsv.ts) writes it to the cache and opens the share
sheet. On the web, [`shareCsv.web.ts`](../src/data/shareCsv.web.ts) downloads
it.

**Borrar todos los datos** asks for confirmation, then calls `eraseAll` and
seeds the default categories again in one `write`. Erasing clears the settings,
so `onboarded` is false and `Root` shows onboarding. When signed in, it first
erases the account's copy with `DELETE /data`; if that fails, it erases nothing,
since the next sync would bring the data back.

## Account and sync

```text
Continuar con Google ─► signIn ─► browser ─► Worker ─► atomic://auth?code=…
                                                          │
                     keystore ◄─ session ◄─ POST /auth/token
                                                          │
write ─► writes + 1 ─► sync ─► POST /sync ─► completeSync ─► reload
```

1. **Continuar con Google** or **Continuar con GitHub**, in Ajustes or
   onboarding, calls [`signIn`](../src/account/signIn.ts). It opens the Worker's
   start route in a browser session with a PKCE challenge
   ([API](../../../docs/api.md#signing-in)) and trades the returned code for a
   session. Closing the browser cancels and changes nothing.
2. `AccountProvider` syncs once, then saves the session in the keystore. The
   first sync tells a returning account from a new one, so when it fails the
   sign-in fails: the device forgets the session and shows the connection error.
3. A sync runs once the session loads, after every `write` (the `writes` count
   in `DataProvider`) and when the app returns to the foreground. One sync runs
   at a time; a request made during a sync runs one more after it.
   [`syncStore`](../src/account/syncStore.ts) sends the pending changes and
   applies the reply, page by page while the Worker reports more
   ([Core](../../../docs/core.md#sync)). When records arrive, `reload` refreshes
   the snapshot.
4. A failed sync sets the status to offline, which Ajustes shows under the
   email; the changes stay pending for the next one. A 401 means the session
   ended elsewhere: the device signs out and keeps its data.

**Cerrar sesión** ends the session at the Worker, deletes it from the keystore
and calls `forgetSync`, so the data stays on the device and reaches the next
account in full. **Eliminar cuenta** asks for confirmation, deletes the account
at the Worker and signs out the same way.

The web build has no keystore and its redirect targets the app scheme, so
[`session.web.ts`](../src/account/session.web.ts) turns accounts off there and
Ajustes shows no Cuenta section.
