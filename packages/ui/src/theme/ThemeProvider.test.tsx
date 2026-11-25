import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { palettes } from './colors';
import { ThemeProvider, useTheme } from './ThemeProvider';

function Probe() {
  const { scheme, colors } = useTheme();
  return <Text>{`${scheme} ${colors.background}`}</Text>;
}

describe('ThemeProvider', () => {
  it('gives its subtree the forced scheme and its palette', async () => {
    await render(
      <ThemeProvider scheme="dark">
        <Probe />
      </ThemeProvider>
    );

    expect(screen.getByText(`dark ${palettes.dark.background}`)).toBeOnTheScreen();
  });

  it('follows the system scheme outside a provider', async () => {
    await render(<Probe />);

    expect(screen.getByText(`light ${palettes.light.background}`)).toBeOnTheScreen();
  });
});
