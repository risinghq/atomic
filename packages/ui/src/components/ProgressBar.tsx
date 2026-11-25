import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { springs } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';

export type ProgressBarProps = {
  /** From 0 to 1. Values outside are clamped. */
  progress: number;
  /** The fill color. Defaults to the progress green. */
  color?: string;
  height?: number;
  label?: string;
};

export function ProgressBar({ progress, color, height = 8, label }: ProgressBarProps) {
  const { colors } = useTheme();
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withSpring(clamped, springs.gentle);
  }, [fill, clamped]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }), [fill]);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: colors.track }]}>
      <Animated.View
        style={[
          styles.fill,
          { borderRadius: height / 2, backgroundColor: color ?? colors.progress },
          fillStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%' },
});
