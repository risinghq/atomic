import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { withAlpha } from '../theme/colors';
import { springs } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';

export type MeterSegment = {
  key: string;
  /** This segment's part of the whole bar, from 0 to 1. */
  share: number;
  color: string;
};

export type BudgetMeterProps = {
  segments: readonly MeterSegment[];
  /** Where the pace tick sits, from 0 to 1: the elapsed part of the period. */
  tick?: number;
  height?: number;
  label?: string;
};

const GAP = 2;
// A segment thinner than this reads as a stray line, so it is left out.
const MIN_SHARE = 0.005;

/**
 * A capsule filled by colored segments, with an optional pace tick hanging from
 * its top edge. The filled part springs open as one piece.
 */
export function BudgetMeter({ segments, tick, height = 14, label }: BudgetMeterProps) {
  const { colors } = useTheme();
  const fill = useSharedValue(0);

  const visible = segments.filter((segment) => clamp(segment.share) >= MIN_SHARE);
  const total = Math.min(
    1,
    visible.reduce((sum, segment) => sum + clamp(segment.share), 0)
  );
  const tickWidth = Math.max(10, height);

  useEffect(() => {
    fill.value = withSpring(total, springs.gentle);
  }, [fill, total]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }), [fill]);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(total * 100)}>
      <View
        style={[
          styles.track,
          { height, borderRadius: height / 2, backgroundColor: withAlpha(colors.text, 0.12) },
        ]}>
        <Animated.View testID="meter-fill" style={[styles.fill, fillStyle]}>
          {visible.map((segment, index) => (
            <View
              key={segment.key}
              style={{
                flex: clamp(segment.share),
                backgroundColor: segment.color,
                marginRight: index < visible.length - 1 || total < 1 ? GAP : 0,
              }}
            />
          ))}
        </Animated.View>
      </View>
      {tick === undefined ? null : (
        <View
          testID="meter-tick"
          pointerEvents="none"
          style={[
            styles.tick,
            {
              left: `${clamp(tick) * 100}%`,
              marginLeft: -tickWidth / 2,
              borderLeftWidth: tickWidth / 2,
              borderRightWidth: tickWidth / 2,
              borderTopWidth: tickWidth * 0.46,
              borderTopColor: colors.text,
            },
          ]}
        />
      )}
    </View>
  );
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%', flexDirection: 'row', overflow: 'hidden' },
  tick: {
    position: 'absolute',
    top: -3,
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
