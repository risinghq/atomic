import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { radii, space } from '../theme/layout';
import { useTheme } from '../theme/ThemeProvider';
import type { PadKey } from './amountInput';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type NumberPadProps = {
  onKey: (key: PadKey) => void;
  onConfirm: () => void;
  /** Disables the confirm key, such as while the amount is zero. */
  canConfirm?: boolean;
  /** The decimal separator shown on the point key. The key still sends `.`. */
  decimalSeparator?: string;
};

const ROWS: PadKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

/** Digits in a 3×4 grid of rounded keys, with the confirm key bottom right. */
export function NumberPad({
  onKey,
  onConfirm,
  canConfirm = true,
  decimalSeparator = '.',
}: NumberPadProps) {
  const { colors } = useTheme();
  const key = (value: PadKey, label: string = value) => (
    <PressableScale
      key={value}
      accessibilityLabel={label}
      onPress={() => onKey(value)}
      style={[styles.key, { backgroundColor: colors.surface }]}>
      <Text variant="largeTitle" weight="regular">
        {label}
      </Text>
    </PressableScale>
  );

  return (
    <View style={styles.pad}>
      {ROWS.map((row) => (
        <View key={row.join('')} style={styles.row}>
          {row.map((value) => key(value))}
        </View>
      ))}
      <View style={styles.row}>
        {key('.', decimalSeparator)}
        {key('0')}
        <PressableScale
          accessibilityLabel="Confirmar"
          feedback="success"
          disabled={!canConfirm}
          onPress={onConfirm}
          style={[styles.key, { backgroundColor: colors.accent }, !canConfirm && styles.disabled]}>
          <Ionicons name="checkmark" size={26} color={colors.onAccent} />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  key: {
    flex: 1,
    height: 56,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
});
