import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { palettes, type ColorScheme, type Colors } from './colors';
import { radii, space } from './layout';

export type Theme = {
  scheme: ColorScheme;
  colors: Colors;
  space: typeof space;
  radii: typeof radii;
};

const SchemeContext = createContext<ColorScheme | null>(null);

type ThemeProviderProps = {
  /** Forces a scheme. Without it the theme follows the system setting. */
  scheme?: ColorScheme;
  children: ReactNode;
};

export function ThemeProvider({ scheme, children }: ThemeProviderProps) {
  const system = useColorScheme();
  const resolved = scheme ?? (system === 'dark' ? 'dark' : 'light');
  return <SchemeContext.Provider value={resolved}>{children}</SchemeContext.Provider>;
}

/** The current theme. Outside a ThemeProvider it follows the system setting. */
export function useTheme(): Theme {
  const provided = useContext(SchemeContext);
  const system = useColorScheme();
  const scheme = provided ?? (system === 'dark' ? 'dark' : 'light');
  return useMemo(() => ({ scheme, colors: palettes[scheme], space, radii }), [scheme]);
}
