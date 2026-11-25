# Architecture

The atomic app is one state-driven shell over `@atomic/ui` and `@atomic/core`.
It has no router. A screen reads one shared snapshot of the store and writes
back through one function.

```text
index.ts ─► App ─► DataProvider ─► Root ─┬─► Onboarding
                     │                    └─► Shell ─► LogScreen
                     │                                InsightsScreen
                     │                                BudgetsScreen
                     │                                SettingsScreen
                     │                                EntryForm (sheet)
                     └─ Store (@atomic/core, expo-sqlite)
```

## Code map

| Path                                                          | Owns                                                                                            |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [`index.ts`](../index.ts)                                     | Registers `App` as the root component.                                                          |
| [`src/App.tsx`](../src/App.tsx)                               | Holds the splash screen until the fonts and the store are ready, then mounts the providers.     |
| [`src/data/openAppStore.ts`](../src/data/openAppStore.ts)     | Opens `atomic.db`, runs the AsyncStorage import and seeds the default categories.               |
| [`src/data/DataProvider.tsx`](../src/data/DataProvider.tsx)   | Loads the snapshot and exposes it with `write` through `useData()`.                             |
| [`src/Root.tsx`](../src/Root.tsx)                             | Shows `Onboarding` until `settings.onboarded`, then `Shell`.                                    |
| [`src/Shell.tsx`](../src/Shell.tsx)                           | The tab bar, the active tab and the entry sheet. Android back returns to Registro first.        |
| [`src/screens/`](../src/screens)                              | One file per tab, plus `Onboarding`.                                                            |
| [`src/entry/EntryForm.tsx`](../src/entry/EntryForm.tsx)       | The entry sheet: kind, number pad, then note and category. Saving the category saves the entry. |
| [`src/budgets/BudgetForm.tsx`](../src/budgets/BudgetForm.tsx) | The budget sheet: what the budget covers, then its period and amount.                           |
| [`src/format.ts`](../src/format.ts)                           | Spanish (es-PE) money, day, period and budget labels.                                           |
| [`src/choices.ts`](../src/choices.ts)                         | The currency and week-start options that onboarding and Ajustes share.                          |
| [`src/useSheet.ts`](../src/useSheet.ts)                       | A sheet's open state, the record it shows and a session key that starts its form fresh.         |
| [`src/useNow.ts`](../src/useNow.ts)                           | The current time, refreshed every minute and when the app returns to the foreground.            |

## Tabs

| Tab          | Screen           | Shows                                                                           |
| ------------ | ---------------- | ------------------------------------------------------------------------------- |
| Registro     | `LogScreen`      | This month's net and every transaction by day. Tap edits, long press deletes.   |
| Resumen      | `InsightsScreen` | Spending or income per week, month or year: a bar chart and a list by category. |
| Presupuestos | `BudgetsScreen`  | The overall budget split by category, then one card per category budget.        |
| Ajustes      | `SettingsScreen` | The currency and the first day of the week.                                     |

The add button in the tab bar opens the entry sheet from every tab. Only the
active tab is mounted.

## Boundaries

- Screens read data with `useData()` and change it with `write`. Only
  `openAppStore` opens the database.
- Money stays in integer cents until it reaches a ui component, which takes
  `fromCents(amount)`.
- Period and total math comes from `@atomic/core`. `src/format.ts` only turns
  results into text.
- Interface text is Spanish.

[Data flow](data-flow.md) follows one entry from the number pad to the screens.
