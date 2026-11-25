# atomic

[![CI](https://github.com/risinghq/atomic/actions/workflows/ci.yml/badge.svg)](https://github.com/risinghq/atomic/actions/workflows/ci.yml)

atomic is a plain expense tracker for iOS, Android and the web. It records
expenses and income in a few taps, shows where the money went, and keeps weekly
or monthly budgets. Everything stays on the device. The interface is in Spanish.

The repository is a bun workspace. The app lives in `apps/atomic`, and code that
more than one app shares lives under `packages/`: the components in
`@atomic/ui`, with a gallery app in `apps/catalog`, and the data model and store
in `@atomic/core`. See [Repository layout](docs/architecture.md).

## Get started

```bash
git clone https://github.com/risinghq/atomic
cd atomic
mise install
bun install
bun run --cwd apps/atomic start
```

`mise install` installs the tool versions in `mise.toml`. `start` runs the
development server. Scan its QR code with Expo Go. Simulators, emulators and
preview builds are in [Running the apps](docs/running.md).

The app opens on one screen that asks for the currency and the first day of the
week. **Empezar** lands on Registro.

## Features

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
- **Local storage.** Data lives in SQLite on the device. There is no server and
  no account.
- **Exact money arithmetic.** Amounts are stored and summed in integer cents.

## Documentation

The [manual](docs/README.md) covers running the apps, the repository layout,
testing, the shared packages, and the atomic app's architecture and data flow.

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md).

## License

[Apache License 2.0](LICENSE).
