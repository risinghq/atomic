import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { haptic } from '../theme/haptics';
import { springs } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';

export type ToggleProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  /** Read by screen readers; the visible label usually sits in the row. */
  label: string;
  disabled?: boolean;
};

const WIDTH = 51;
const HEIGHT = 31;
const KNOB = 27;
const INSET = (HEIGHT - KNOB) / 2;
const TRAVEL = WIDTH - KNOB - INSET * 2;

export function Toggle({ value, onChange, label, disabled = false }: ToggleProps) {
  const { colors } = useTheme();
  const on = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    on.value = withSpring(value ? 1 : 0, springs.snappy);
  }, [on, value]);

  const trackStyle = useAnimatedStyle(
    () => ({
      backgroundColor: interpolateColor(on.value, [0, 1], [colors.track, colors.progress]),
    }),
    [on, colors.track, colors.progress]
  );
  const knobStyle = useAnimatedStyle(
    () => ({ transform: [{ translateX: on.value * TRAVEL }] }),
    [on]
  );

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      aria-checked={value}
      aria-disabled={disabled}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        haptic('light');
        onChange(!value);
      }}
      style={disabled && styles.disabled}>
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.knob, knobStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: WIDTH, height: HEIGHT, borderRadius: HEIGHT / 2, padding: INSET },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  disabled: { opacity: 0.4 },
});
