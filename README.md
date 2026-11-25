# pocket

[![CI](https://github.com/risinghq/pocket/actions/workflows/ci.yml/badge.svg)](https://github.com/risinghq/pocket/actions/workflows/ci.yml)

pocket holds small apps for iOS, Android and the web that share one set of
components and one on-device store. Their interfaces are in Spanish.

atomic is a plain expense tracker. It records expenses and income in a few taps,
shows where the money went, and keeps weekly or monthly budgets.

foco tells the time every few minutes, so you notice where your attention went
and choose again. You say what you are doing and how long it should take; each
chime says how long you have been at it.

The repository is a bun workspace. Each app lives under `apps/`, and code that
more than one app shares lives under `packages/`: the components in
`@rising/ui`, with a gallery app in `apps/catalog`, and the data model and store
in `@rising/core`. See [Repository layout](docs/architecture.md).

## Get started

```bash
git clone https://github.com/risinghq/pocket
cd pocket
mise install
bun install
bun run --cwd apps/atomic start
```

`mise install` installs the tool versions in `mise.toml`. `start` runs the
development server. Scan its QR code with Expo Go. Simulators, emulators and
preview builds are in [Running the apps](docs/running.md).

The app opens on one screen that asks for the currency and the first day of the
week. **Empezar** lands on Registro.

Start foco the same way with `bun run --cwd apps/foco start`.

## Features

### atomic

- **Fast entry.** The add button opens a number pad. Confirm the amount, add a
  note if you want, and tap a category to save.
- **Registro.** Every transaction grouped by day, with this month's net on top.
  Tap one to edit it, long press to delete it.
- **Resumen.** Spending or income for a week, a month or a year: a bar chart and
  the share of each category.
- **Presupuestos.** An overall budget split by category, and budgets per
  category, each per week or per month, with what is left per day.
- **Ajustes.** The currency (soles, dollars or euros), the first day of the
  week, a CSV export of every transaction, and erasing all data.
- **Local storage.** Data lives in SQLite on the device. An optional account,
  through Google, GitHub or email, syncs it across devices.
- **Exact money arithmetic.** Amounts are stored and summed in integer cents.

### foco

- **Chimes.** A notification every 5, 10, 15 or 25 minutes, on the clock (:00,
  :05, :10), with the time and the minutes spent on the current task. They
  arrive with the app closed. The web build has no chimes.
- **Timebox.** Give a task a time, and once it has run over, chimes say by how
  much, with a longer vibration.
- **Cambié.** Answer a chime with Cambié to name the new task, or Sigo to carry
  on.
- **Variable.** Chimes at irregular intervals, up to 40% shorter or longer, so
  you stop waiting for them.
- **Voz.** On Android, each chime also says the time and the minutes aloud,
  except in silent or vibrate mode.
- **Horario.** Chimes only on the days and hours you choose.
- **Hoy.** Today's tasks in order, and the minutes each took.
- **Local only.** The settings and the day's log live in SQLite on the device,
  with no account.

## Documentation

The [manual](docs/README.md) covers running the apps, the repository layout,
testing, the shared packages, and each app's architecture.

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md).

## License

[Apache License 2.0](LICENSE).
