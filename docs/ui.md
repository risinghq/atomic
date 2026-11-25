# UI

`@atomic/ui` holds the theme and components every app shares. The look is quiet
and rounded: white or pure-black screens, soft grey surfaces, one dark accent
for the primary action, green for income, and rounded type throughout. The
palette, sizes and motion follow the design of the
[Dime](https://github.com/rafsoh/dimeApp) iOS app. Dime is GPL-3.0, so this
package reuses only its design values and none of its code or assets.

## Using it

Add `"@atomic/ui": "workspace:*"` to the app's dependencies, wrap the app in
`ThemeProvider`, and load the fonts before the first text renders:

```tsx
import { useFonts } from 'expo-font';
import { ThemeProvider, fontAssets } from '@atomic/ui';

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
| `textStyle()` | [`typography.ts`](../packages/ui/src/theme/typography.ts) | Size, line height and rounded face for a text variant.                                    |
| `space`       | [`layout.ts`](../packages/ui/src/theme/layout.ts)         | Padding and gaps on a 4-point grid.                                                       |
| `radii`       | [`layout.ts`](../packages/ui/src/theme/layout.ts)         | Corner radii, from 6 for chips to `full` for pills.                                       |
| `springs`     | [`motion.ts`](../packages/ui/src/theme/motion.ts)         | `snappy` for presses, `smooth` for things moving into place, `gentle` for large surfaces. |
| `durations`   | [`motion.ts`](../packages/ui/src/theme/motion.ts)         | 150, 200 and 300 ms for timed fades.                                                      |
| `haptic()`    | [`haptics.ts`](../packages/ui/src/theme/haptics.ts)       | Feedback on a press, a selection or a result. Does nothing on web.                        |

### Type

iOS draws SF Rounded through the `ui-rounded` system family. Android and web
have no rounded system face, so they use Nunito, one family per weight. The text
variants follow the iOS Dynamic Type sizes, plus `display` (56) and `amount`
(34) for money. Apply `tabularNumbers` to any amount so its digits keep the same
width.

### Springs

A spring is written as a response, the seconds one undamped oscillation takes,
and a damping fraction. `spring(response, fraction)` converts that to the mass,
stiffness and damping Reanimated's `withSpring` takes.

## Testing

The package's tests render through `react-native-web` in jsdom, so a test sees
the real DOM a component produces.
[`tests/setup.ts`](../packages/ui/tests/setup.ts) stubs the Expo native modules,
which need a device.
