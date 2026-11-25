import { render, screen } from '@testing-library/react';
import { Text } from 'react-native';
import { describe, expect, it } from 'vitest';
import { palettes } from './colors';
import { ThemeProvider, useTheme } from './ThemeProvider';

function Probe() {
  const { scheme, colors } = useTheme();
  return <Text>{`${scheme} ${colors.background}`}</Text>;
}

describe('ThemeProvider', () => {
  it('gives its subtree the forced scheme and its palette', () => {
    render(
      <ThemeProvider scheme="dark">
        <Probe />
      </ThemeProvider>
    );
    expect(screen.getByText(`dark ${palettes.dark.background}`)).toBeTruthy();
  });

  it('follows the system scheme outside a provider', () => {
    render(<Probe />);
    expect(screen.getByText(`light ${palettes.light.background}`)).toBeTruthy();
  });
});
