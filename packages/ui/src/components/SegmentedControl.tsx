import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptic } from '../theme/haptics';
import { radii, space } from '../theme/layout';
import { springs } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

export type Segment<T extends string> = { value: T; label: string };

export type SegmentedControlProps<T extends string> = {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  /** What a screen reader announces for the whole row. */
  label?: string;
};

/** A row of choices with a pill that slides to the selected one. */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  label,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  const count = Math.max(1, segments.length);
  const index = Math.max(
    0,
    segments.findIndex((segment) => segment.value === value)
  );
  // The pill animates the selected index and is placed in percentages of the
  // track, so it needs no layout measurement and starts under its segment.
  const position = useSharedValue(index);

  useEffect(() => {
    position.value = withSpring(index, springs.smooth);
  }, [position, index]);

  const pillStyle = useAnimatedStyle(
    () => ({ left: `${(position.value * 100) / count}%` }),
    [position, count]
  );

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={[styles.track, { backgroundColor: colors.surface }]}>
      <View pointerEvents="none" style={styles.pillArea}>
        <Animated.View
          testID="segmented-pill"
          style={[
            styles.pill,
            { width: `${100 / count}%`, backgroundColor: colors.raised },
            pillStyle,
          ]}
        />
      </View>
      {segments.map((segment) => {
        const selected = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            accessibilityRole="tab"
            aria-selected={selected}
            onPress={() => {
              if (selected) return;
              haptic('selection');
              onChange(segment.value);
            }}
            style={styles.segment}>
            <Text
              variant="subheadline"
              weight={selected ? 'semibold' : 'medium'}
              color={selected ? 'text' : 'textMuted'}>
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const PAD = 3;

const styles = StyleSheet.create({
  // The pill is 1/count of the track, so segments need equal widths, which
  // flex: 1 gives only when the track has a width of its own to share.
  track: { flexDirection: 'row', alignSelf: 'stretch', padding: PAD, borderRadius: radii.md },
  pillArea: { position: 'absolute', top: PAD, bottom: PAD, left: PAD, right: PAD },
  pill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: radii.md - PAD,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: space.md,
  },
});
