# UI

`@rising/ui` holds the theme and components every app shares. The look is quiet
and rounded: white or pure-black screens, soft grey surfaces, one dark accent
for the primary action, green for income, and Inter throughout. The palette,
sizes and motion follow the design of the
[Dime](https://github.com/rafsoh/dimeApp) iOS app. Dime is GPL-3.0, so this
package reuses only its design values and none of its code or assets.

## Using it

Add `"@rising/ui": "workspace:*"` to the app's dependencies, wrap the app in
`ThemeProvider`, and load the fonts before the first text renders:

```tsx
import { useFonts } from 'expo-font';
import { ThemeProvider, fontAssets } from '@rising/ui';

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontAssets);
  if (!fontsLoaded) return null;
  return <ThemeProvider>{/* screens */}</ThemeProvider>;
}
```

`ThemeProvider` follows the system light or dark setting. Pass `scheme="light"`
or `scheme="dark"` to force one. `useTheme()` returns the scheme, its `colors`,
`space` and `radii`.

## Styling

The package styles with `StyleSheet` and the theme, not NativeWind. A package
that depends only on React Native works in any app, and Reanimated animates
plain style objects.

## Tokens

| Token         | Source                                                    | Use                                                                                       |
| ------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `colors`      | [`colors.ts`](../packages/ui/src/theme/colors.ts)         | Semantic colors per scheme. Components never use a hex value.                             |
| `textStyle()` | [`typography.ts`](../packages/ui/src/theme/typography.ts) | Size, line height, Inter weight and tracking for a text variant.                          |
| `space`       | [`layout.ts`](../packages/ui/src/theme/layout.ts)         | Padding and gaps on a 4-point grid.                                                       |
| `radii`       | [`layout.ts`](../packages/ui/src/theme/layout.ts)         | Corner radii, from 6 for chips to `full` for pills.                                       |
| `springs`     | [`motion.ts`](../packages/ui/src/theme/motion.ts)         | `snappy` for presses, `smooth` for things moving into place, `gentle` for large surfaces. |
| `durations`   | [`motion.ts`](../packages/ui/src/theme/motion.ts)         | 150, 200 and 300 ms for timed fades.                                                      |
| `haptic()`    | [`haptics.ts`](../packages/ui/src/theme/haptics.ts)       | Feedback on a press, a selection or a result.                                             |

### Type

Every platform draws Inter, one family per weight, so a screen looks the same on
iOS and Android. The text variants follow the iOS Dynamic Type sizes, plus three
for money: `hero` (65) for the month's total, `display` (56) for the amount
being typed and `amount` (34) for a total inside a card. Each variant carries
Inter's [dynamic tracking](https://rsms.me/inter/dynmetrics/) for its size:
neutral at caption size, tighter as the text grows. Apply `tabularNumbers` to
any amount so its digits keep the same width.

### Haptics

A haptic marks a commit, not a touch. Confirming an amount, switching tabs,
opening the add screen, changing a segment or a toggle, and a toast play one. A
plain press on a row, card or key plays none.

`setHapticLevel` picks which play, and the app sets it from the user's Vibración
setting:

| Level       | Plays                                                                        |
| ----------- | ---------------------------------------------------------------------------- |
| `off`       | Nothing.                                                                     |
| `essential` | Outcomes only: `success`, `warning` and `error`, so a saved or failed toast. |
| `all`       | Outcomes, and every switch, segment, tab and confirm too.                    |

### Springs

A spring is written as a response, the seconds one undamped oscillation takes,
and a damping fraction. `spring(response, fraction)` converts that to the mass,
stiffness and damping Reanimated's `withSpring` takes.

### Surfaces

Four greys stack in this order: `background` for the screen, `card` for a
grouped list, `surface` for a control resting on the screen (a key, a segmented
track), and `raised` for a control lifted off a surface (the selected segment).
`track` is the empty part of a toggle or progress bar. `tints` holds the
category colors an `IconTile` sits on; they are the same in both schemes.

## Components

| Component                     | Use                                                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Text`                        | Any text. Takes a `variant`, `weight`, color name and `tabular`.                                                                                                   |
| `PressableScale`              | The base of every tappable control: shrinks on a spring while held. `feedback` adds a haptic on press.                                                             |
| `Button`                      | `primary` (dark accent), `secondary` (grey) or `plain`, in `regular` or `small` (pill) size.                                                                       |
| `IconTile`                    | A rounded square with an emoji or icon on a tint, for categories and settings rows.                                                                                |
| `Amount`, `amountParts()`     | Money in the app's currency. At `amount` size and above, the sign and symbol shrink and turn grey beside the number.                                               |
| `ListSection`, `ListRow`      | A titled grey card of 48-point rows with hairlines between them. A row with `onPress` shows a chevron.                                                             |
| `TransactionRow`, `DayHeader` | One transaction with its category tile and amount; income shows green with a `+`. A day header shows the day and its total.                                        |
| `SegmentedControl`            | Two to four choices on a grey track; the selected pill slides on a spring.                                                                                         |
| `Toggle`                      | An on/off switch, green when on.                                                                                                                                   |
| `NumberPad`, `applyKey()`     | The amount keypad. `applyKey(text, key)` applies one key to the typed text and enforces two decimals and nine whole digits.                                        |
| `ProgressBar`                 | A budget bar. The fill springs to its new value.                                                                                                                   |
| `ToastProvider`, `useToast()` | A dark pill near the bottom that confirms an action and leaves on its own.                                                                                         |
| `TabBar`                      | Icon tabs with the dark add capsule in the middle. It holds no routes: the app maps `active` and `onChange` to its navigator.                                      |
| `CategoryPicker`              | A three-column grid of category tiles, emoji over name on a wash of the category color. The selected tile darkens and gains a border.                              |
| `BudgetMeter`                 | A capsule split into colored segments, with an optional pace tick at the elapsed part of the period.                                                               |
| `BudgetCard`                  | One category's budget: the amount left or over, a status line and a meter in the category color.                                                                   |
| `BudgetSummaryCard`           | The overall budget: the large amount left or over, and a meter split by category. Pressable like `BudgetCard`.                                                     |
| `PeriodPicker`                | The period on screen between back and forward arrows. `canNext={false}` stops at the current period.                                                               |
| `BarChart`, `showsAverage()`  | Bars on faint tracks with labels under them. While a bar is `current`, the others dim. The dashed average shows only when a quarter of the elapsed bars hold data. |
| `Sheet`                       | A bottom panel over a dimmed screen. Tapping the dim closes it; it stays mounted until it has slid away.                                                           |
| `EmptyState`                  | What a screen shows before it has data: an emoji, a title, a line of why and an optional action.                                                                   |

`TransactionRow` takes `onLongPress` for the row's actions, such as delete. Rows
have no swipe actions, so the package needs no gesture library.

`withAlpha(color, alpha)` turns a `#RRGGBB` color into `rgba()`. The category
washes and the chart tracks use it.

Interactive components expose their state (selected, checked, disabled,
progress) through `aria-*` props, which React Native reads on both platforms.

Labels a component draws itself, such as the number pad's "Confirmar" and the
tab bar's "Agregar", default to Spanish and can be overridden by prop where the
component offers one.

## Catalog

[`apps/catalog`](../apps/catalog) shows every component in light and dark on one
scrolling screen, with the tab bar and toasts live. Change a component and check
it there before an app uses it:

```bash
bun run --cwd apps/catalog start
```

Scan the QR code with Expo Go, or press <kbd>a</kbd> for a running Android
emulator. The header's Claro/Oscuro control switches the scheme.

## Testing

[`docs/testing.md`](testing.md) describes how the tests run. A component test
renders a small harness that uses the component as a screen would, and asserts
what a user sees or what a screen reader announces.

Reanimated's animated styles do not reach the rendered tree under Jest, so a
test cannot see an element fade or slide. A test of a timed component, such as
the toast, uses real timers and a short duration.
