# Architecture

The atomic app is one state-driven shell over `@atomic/ui` and `@atomic/core`.
It has no router. A screen reads one shared snapshot of the store and writes
back through one function.

```text
index.ts ─► App ─► DataProvider ─► AccountProvider ─► Root ─┬─► Onboarding
                     │                  │                   └─► Shell ─► LogScreen
                     │                  │                               InsightsScreen
                     │                  │                               BudgetsScreen
                     │                  │                               SettingsScreen
                     │                  │                               EntryForm (sheet)
                     │                  └─ the Worker (apps/api), over fetch
                     └─ Store (@atomic/core, expo-sqlite)
```

## Code map

| Path                                                                    | Owns                                                                                             |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [`index.ts`](../index.ts)                                               | Registers `App` as the root component.                                                           |
| [`src/App.tsx`](../src/App.tsx)                                         | Holds the splash screen until the fonts and the store are ready, then mounts the providers.      |
| [`src/data/openAppStore.ts`](../src/data/openAppStore.ts)               | Opens `atomic.db`, runs the AsyncStorage import and seeds the default categories.                |
| [`src/data/DataProvider.tsx`](../src/data/DataProvider.tsx)             | Loads the snapshot and exposes it with `write` through `useData()`.                              |
| [`src/data/csv.ts`](../src/data/csv.ts)                                 | Turns the transactions into the CSV that Ajustes exports.                                        |
| [`src/account/AccountProvider.tsx`](../src/account/AccountProvider.tsx) | The session, the sync status and the account actions, through `useAccount()`.                    |
| [`src/account/api.ts`](../src/account/api.ts)                           | The Worker's routes. `EXPO_PUBLIC_API_URL` points a build at another Worker.                     |
| [`src/account/signIn.ts`](../src/account/signIn.ts)                     | The browser sign-in with PKCE, ending in a session.                                              |
| [`src/account/session.ts`](../src/account/session.ts)                   | Keeps the session in the keystore. The web build has no accounts (`session.web.ts`).             |
| [`src/account/syncStore.ts`](../src/account/syncStore.ts)               | One sync: sends the store's changes and applies the Worker's, page by page.                      |
| [`src/account/AccountSection.tsx`](../src/account/AccountSection.tsx)   | Ajustes' Cuenta rows: sign in, or the email, sign out and account deletion.                      |
| [`src/data/shareCsv.ts`](../src/data/shareCsv.ts)                       | Hands the CSV to the share sheet, or to a download on the web (`shareCsv.web.ts`).               |
| [`src/Root.tsx`](../src/Root.tsx)                                       | Shows `Onboarding` until `settings.onboarded`, then `Shell` behind `AppLock`.                    |
| [`src/lock/`](../src/lock)                                              | The lock screen over the app, and the device's screen lock it asks for.                          |
| [`src/Shell.tsx`](../src/Shell.tsx)                                     | The tab bar, the active tab and the entry sheet. Android back returns to Registro first.         |
| [`src/screens/`](../src/screens)                                        | One file per tab, plus `Onboarding`.                                                             |
| [`src/entry/EntryForm.tsx`](../src/entry/EntryForm.tsx)                 | The entry sheet: kind, number pad, then note, repeat and category. The category saves the entry. |
| [`src/entry/frequent.ts`](../src/entry/frequent.ts)                     | The repeated entries the number pad offers in one tap.                                           |
| [`src/budgets/BudgetForm.tsx`](../src/budgets/BudgetForm.tsx)           | The budget sheet: what the budget covers, then its period and amount.                            |
| [`src/categories/`](../src/categories)                                  | Ajustes' category sheet: the list per kind, and the form that adds, edits, archives or restores. |
| [`src/recurring/RecurringList.tsx`](../src/recurring/RecurringList.tsx) | Ajustes' recurring sheet: each rule with its next date, and stopping one.                        |
| [`src/format.ts`](../src/format.ts)                                     | Spanish (es-PE) money, day, period and budget labels.                                            |
| [`src/search.ts`](../src/search.ts)                                     | The transactions a Registro search finds.                                                        |
| [`src/choices.ts`](../src/choices.ts)                                   | The currency, week-start and repeat options, and the repeat labels.                              |
| [`src/useSheet.ts`](../src/useSheet.ts)                                 | A sheet's open state, the record it shows and a session key that starts its form fresh.          |
| [`src/useNow.ts`](../src/useNow.ts)                                     | The current day, refreshed at midnight and when the app returns to the foreground.               |

## Tabs

| Tab          | Screen           | Shows                                                                                                                   |
| ------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Registro     | `LogScreen`      | This month's net and every transaction by day, with a search. Tap edits, long press deletes.                            |
| Resumen      | `InsightsScreen` | Spending or income per week, month or year: a bar chart and a list by category.                                         |
| Presupuestos | `BudgetsScreen`  | The overall budget split by category, then one card per category budget.                                                |
| Ajustes      | `SettingsScreen` | The account, the currency, the week start, categories, recurring entries, the app lock, the CSV export and erasing all. |

The add button in the tab bar opens the entry sheet from every tab. Only the
active tab is mounted.

## Boundaries

- Screens read data with `useData()` and change it with `write`. Only
  `openAppStore` opens the database. Only `src/account/api.ts` calls the
  network.
- Money stays in integer cents until it reaches a ui component, which takes
  `fromCents(amount)`.
- Period and total math comes from `@atomic/core`. `src/format.ts` only turns
  results into text.
- Interface text is Spanish.

[Data flow](data-flow.md) follows one entry from the number pad to the screens.
