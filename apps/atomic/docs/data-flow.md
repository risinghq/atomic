# Data flow

## Start

1. [`App`](../src/App.tsx) keeps the splash screen up and calls
   [`openAppStore`](../src/data/openAppStore.ts).
2. `openAppStore` opens `atomic.db` with expo-sqlite and runs the migrations. It
   then imports what the AsyncStorage version of the app left
   ([Core](../../../docs/core.md#the-asyncstorage-import)) and seeds the default
   categories on a new install.
3. [`DataProvider`](../src/data/DataProvider.tsx) records the recurring
   transactions that came due, then loads the snapshot: every category (archived
   ones included), the transactions, the budgets, the recurring rules and the
   settings. It renders nothing until the snapshot is loaded.
4. [`AccountProvider`](../src/account/AccountProvider.tsx) reads the session
   from the keystore and, when there is one, starts a sync.
5. [`Root`](../src/Root.tsx) shows `Onboarding` while `settings.onboarded` is
   false. **Empezar** saves the chosen currency and week start with
   `onboarded: true`, and the reloaded snapshot switches `Root` to the shell.
   Signing in from onboarding instead keeps the account's currency and week
   start when the account already holds data. Past onboarding, `Root` puts the
   shell behind [`AppLock`](../src/lock/AppLock.tsx) (see
   [App lock](#app-lock)).

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

## Frequent entries

A new entry's number pad shows up to three entries of the chosen kind that the
person recorded at least twice in the last 90 days with the same amount,
category and note. [`frequentEntries`](../src/entry/frequent.ts) ranks them by
how often they repeat, then by the latest. Tapping one records it now with
`addTransaction` and closes the sheet. They come from the transactions already
loaded, so there is nothing to set up and nothing extra to sync.

## Searching

The field under Registro's title narrows the log as the person types, from the
snapshot already in memory. [`search`](../src/search.ts) keeps a transaction
when every word of the query appears in its note or its category's name,
ignoring case and accents, or in its amount written with two decimals. The
month's net gives way to the count and the net of what was found.

## Recurring transactions

**Repetir** on the entry form's category step offers Semanal, Mensual and Anual
for a new entry. Picking the category then saves with `addRecurring`, which
records the first transaction at once
([Core](../../../docs/core.md#recurring-transactions)).

Every snapshot load runs `applyRecurring` first, so the occurrences that came
due while the app was closed appear when it opens, after a write and after a
sync. While the app is in the foreground, `DataProvider` sets one timer for the
next occurrence and reloads when it fires. When a load records occurrences, it
counts as a write, so a sync sends them.

**Recurrentes** in Ajustes lists the rules with how often each repeats and its
next date. Tapping one offers **Dejar de repetir**, which calls
`deleteRecurring`; the transactions it recorded stay.

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
Resumen and in weekly budgets. **Vibración** (Apagada, Esencial or Toda) sets
`haptics`, which `Root` passes to `setHapticLevel`. Each device keeps its own,
and the web, which has no haptics, does not show it.

**Exportar CSV** offers this month, last month, this year or everything
([`exportChoices`](../src/data/csv.ts)). A period's file is named for it, such
as `atomic-2026-11.csv` or `atomic-2026.csv`; everything is named for the day,
such as `atomic-2026-11-25.csv`. A period with no transactions shows a toast and
exports nothing. [`toCsv`](../src/data/csv.ts) builds the file: one row per
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

## App lock

**Bloquear la app** in Ajustes sets `lock`, a setting each device keeps for
itself. Turning it on first asks for the device's screen lock through
[`deviceAuth.ts`](../src/lock/deviceAuth.ts), so nobody turns on a lock they
cannot pass. A device with no screen lock gets a toast instead. Turning it off
asks for nothing. The row is hidden on the web.

[`AppLock`](../src/lock/AppLock.tsx) covers the app with a full-screen `Modal`
while locked. The `Modal` also covers a sheet left open, and Android back does
not close it. The app stays mounted under it, so an entry half typed survives.
It locks at a cold start, and on a return from the background after `LOCK_AFTER`
(30 seconds). The share sheet, the sign-in browser and the system's own PIN
screen all leave the app for less than that. Each lock prompts once;
**Desbloquear** prompts again.

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
