# Core

`@atomic/core` holds the data model, the money and period math, and the SQLite
store that every app shares. It is plain TypeScript and imports nothing from
Expo or React Native, so its tests run in Node.

## Model

| Type          | Holds                                                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `Category`    | A name, an emoji and a `#RRGGBB` color, for expenses or income. `position` orders the pickers. An archived one leaves them.   |
| `Transaction` | A positive `amount` in cents, its `kind`, a category, a note and `at` in epoch milliseconds.                                  |
| `Budget`      | An amount per `week` or `month`, for one category or, with a null `categoryId`, for every expense.                            |
| `Settings`    | The first day of the week, the currency code and whether onboarding is done. `defaultSettings` fills in what was never saved. |

Money is a whole number of cents everywhere. `parseCents` reads what the number
pad typed, and `fromCents` gives the value `Amount` displays. `toCents` exists
only to convert old float amounts.

`defaultCategories` is the list a new install starts with. Their ids are the
ones the old AsyncStorage app stored, so imported transactions keep their
category.

## Periods

A `Period` is a week, month or year in local time, with an inclusive `start` and
an exclusive `end`. `periodOf(kind, date, weekStart)` finds the one around a
date, and `shiftPeriod` steps back or forward. `bucketsOf` splits a period into
the chart's bars: days for a week or month, months for a year.

Periods are built from calendar fields, never by adding milliseconds, so a day
is still a calendar day across a daylight-saving change. The tests run in
`America/New_York` to cross one.

## Totals

`totalIn`, `totalsByCategory` and `totalsByBucket` sum transactions inside a
span. `budgetStatus` gives a budget's spent, left, share and the elapsed part of
its current period, which the budget meter draws as its pace tick.

## Store

`openStore(db, { newId })` turns on foreign keys, runs the migrations and
returns the reads and writes. The app passes an `expo-sqlite` database and
`expo-crypto`'s `randomUUID`:

```ts
import { openDatabaseAsync } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { openStore } from '@atomic/core';

const store = await openStore(await openDatabaseAsync('atomic.db'), {
  newId: randomUUID,
});
```

The store depends only on the `Database` interface, the five methods it calls on
expo-sqlite's `SQLiteDatabase`. A type test fails the typecheck if expo-sqlite's
database stops fitting it. The tests pass an in-memory `node:sqlite` database
behind the same methods, so they run real SQL. The package exports it as
`memoryDatabase` from `@atomic/core/testing`
([`testing/memory-database.ts`](../packages/core/testing/memory-database.ts))
for the apps' tests. It needs Node, so app code never imports it.

The schema enforces what the types promise: a positive amount, a known category
and one budget per category plus one overall. `setBudget` replaces the budget
the category had. Bulk writes go out as multi-row inserts of up to 500 rows.

### Migrations

[`migrations.ts`](../packages/core/src/storage/migrations.ts) lists one SQL
script per schema version, and SQLite's `user_version` records how many have
run. Add a change as a new entry at the end. Never edit one that has shipped:
installed databases have already run it.

### The AsyncStorage import

The first version of the app kept its data in AsyncStorage under `user`,
`transactions` and `budgetCategories`. On start, the app calls
`importLegacy(store, AsyncStorage)`:

1. It reads the three keys and converts them: float amounts become cents, an
   unknown category becomes Otros, and each budget becomes a monthly one. A
   record it cannot read is dropped.
2. It writes the records and the default categories in one transaction.
3. It deletes the three keys, so the store is the only copy.

Deleting the keys, not setting a flag, is what stops a second import: erasing
the data clears the settings, and a flag stored there would bring the old data
back. The import skips records the store already has, so an import that stopped
before step 3 runs again safely.
