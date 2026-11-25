import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { minTouchTarget, space } from '../theme/layout';
import { useTheme } from '../theme/ThemeProvider';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type PeriodPickerProps = {
  /** The period on screen, such as "Noviembre 2026" or "18 – 24 nov". */
  title: string;
  onPrevious: () => void;
  onNext: () => void;
  /** False on the current period, which has no next one yet. */
  canNext?: boolean;
  previousLabel?: string;
  nextLabel?: string;
};

/** The period on screen between back and forward arrows. */
export function PeriodPicker({
  title,
  onPrevious,
  onNext,
  canNext = true,
  previousLabel = 'Periodo anterior',
  nextLabel = 'Periodo siguiente',
}: PeriodPickerProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <PressableScale
        accessibilityLabel={previousLabel}
        feedback="selection"
        onPress={onPrevious}
        style={[styles.arrow, { backgroundColor: colors.surface }]}>
        <Ionicons name="chevron-back" size={18} color={colors.icon} />
      </PressableScale>
      <Text variant="headline" numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      <PressableScale
        accessibilityLabel={nextLabel}
        feedback="selection"
        disabled={!canNext}
        onPress={onNext}
        style={[styles.arrow, { backgroundColor: colors.surface, opacity: canNext ? 1 : 0.35 }]}>
        <Ionicons name="chevron-forward" size={18} color={colors.icon} />
      </PressableScale>
    </View>
  );
}

const ARROW = 34;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: minTouchTarget },
  title: { flex: 1, textAlign: 'center' },
  arrow: {
    width: ARROW,
    height: ARROW,
    borderRadius: ARROW / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
