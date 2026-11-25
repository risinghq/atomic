import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
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
};

/** A row of choices with a pill that slides to the selected one. */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    segments.findIndex((segment) => segment.value === value)
  );
  const segmentWidth = segments.length > 0 ? width / segments.length : 0;

  const pillStyle = useAnimatedStyle(
    () => ({
      width: segmentWidth,
      transform: [{ translateX: withSpring(index * segmentWidth, springs.smooth) }],
    }),
    [index, segmentWidth]
  );

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width - PAD * 2)}
      style={[styles.track, { backgroundColor: colors.surface }]}>
      {width > 0 ? (
        <Animated.View style={[styles.pill, { backgroundColor: colors.raised }, pillStyle]} />
      ) : null}
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
  track: { flexDirection: 'row', padding: PAD, borderRadius: radii.md },
  pill: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
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
