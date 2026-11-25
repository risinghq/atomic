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
4. [`Root`](../src/Root.tsx) shows `Onboarding` while `settings.onboarded` is
   false. **Empezar** saves the chosen currency and week start with
   `onboarded: true`, and the reloaded snapshot switches `Root` to the shell.

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
so `onboarded` is false and `Root` shows onboarding.
