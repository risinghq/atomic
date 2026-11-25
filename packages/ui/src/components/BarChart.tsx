import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { withAlpha } from '../theme/colors';
import { space } from '../theme/layout';
import { springs } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

export type ChartBar = {
  key: string;
  /** The short label under the bar, such as "L" or "12". */
  label: string;
  value: number;
  /** The bar for today or this month. While one is current, the others dim. */
  current?: boolean;
  /** A bar after today: drawn fainter and not pressable. */
  future?: boolean;
  /** Read by a screen reader in place of the short label. */
  accessibilityLabel?: string;
};

export type BarChartProps = {
  bars: readonly ChartBar[];
  /** Drawn as a dashed line when enough bars hold data to make it meaningful. */
  average?: number;
  /** Formats a value for the average label and the screen-reader label. */
  formatValue: (value: number) => string;
  color?: string;
  height?: number;
  averageWord?: string;
  onSelect?: (bar: ChartBar) => void;
};

/** Vertical bars on faint tracks, labels underneath, and an optional dashed average. */
export function BarChart({
  bars,
  average = 0,
  formatValue,
  color,
  height = 150,
  averageWord = 'prom.',
  onSelect,
}: BarChartProps) {
  const { colors } = useTheme();

  // Headroom keeps the tallest bar off the top of its track.
  const peak = Math.max(average, ...bars.map((bar) => bar.value));
  const max = peak > 0 ? peak * 1.1 : 1;

  const dense = bars.length > 20;
  const gap = dense ? 3 : bars.length > 8 ? 6 : 10;
  const radius = dense ? 3 : bars.length > 8 ? 6 : 8;

  const emphasis = bars.some((bar) => bar.current);
  const fill = color ?? colors.text;

  return (
    <View style={styles.root}>
      <View style={[styles.bars, { height, gap }]}>
        {bars.map((bar, index) => (
          <Bar
            key={bar.key}
            bar={bar}
            index={index}
            share={bar.value / max}
            height={height}
            radius={radius}
            track={withAlpha(colors.text, bar.future ? 0.035 : 0.07)}
            fill={withAlpha(fill, emphasis && !bar.current ? 0.7 : 1)}
            label={`${bar.accessibilityLabel ?? bar.label}, ${formatValue(bar.value)}`}
            onPress={onSelect && bar.value > 0 && !bar.future ? () => onSelect(bar) : undefined}
          />
        ))}
        {showsAverage(bars, average) ? (
          <AverageLine
            y={height - (height * average) / max}
            text={`${averageWord} ${formatValue(average)}`}
            height={height}
          />
        ) : null}
      </View>
      <View style={[styles.labels, { gap }]} aria-hidden>
        {bars.map((bar) => (
          <Text
            key={bar.key}
            variant="footnote"
            weight="medium"
            color={bar.current ? 'text' : 'textMuted'}
            numberOfLines={1}
            style={styles.label}>
            {bar.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** An average of one or two scattered bars is noise; it needs a quarter of the elapsed bars. */
export function showsAverage(bars: readonly ChartBar[], average: number): boolean {
  const withData = bars.filter((bar) => bar.value > 0).length;
  const elapsed = bars.filter((bar) => !bar.future).length;

  return average > 0 && withData > 1 && withData >= elapsed * 0.25;
}

function Bar({
  bar,
  index,
  share,
  height,
  radius,
  track,
  fill,
  label,
  onPress,
}: {
  bar: ChartBar;
  index: number;
  share: number;
  height: number;
  radius: number;
  track: string;
  fill: string;
  label: string;
  onPress?: () => void;
}) {
  const target = bar.value > 0 ? Math.max(6, height * share) : 0;

  const grown = useSharedValue(0);

  useEffect(() => {
    grown.value = withDelay(index * 20, withSpring(target, springs.gentle));
  }, [grown, target, index]);

  const fillStyle = useAnimatedStyle(() => ({ height: grown.value }), [grown]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.bar, { borderRadius: radius, backgroundColor: track }]}>
      <Animated.View
        testID={`bar-${bar.key}`}
        style={[
          styles.fill,
          { borderRadius: Math.min(radius, target / 2), backgroundColor: fill },
          fillStyle,
        ]}
      />
    </Pressable>
  );
}

const LABEL_HEIGHT = 22;
const DASHES = 60;

function AverageLine({ y, text, height }: { y: number; text: string; height: number }) {
  const { colors } = useTheme();

  // The label sits just above the line, or below it when the line is near the top.
  const above = y - 3 - LABEL_HEIGHT;
  const labelTop = above >= 0 ? above : Math.min(y + 3, height - LABEL_HEIGHT);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} aria-hidden>
      <View style={[styles.dashes, { top: y }]}>
        {Array.from({ length: DASHES }, (_, index) => (
          <View key={index} style={[styles.dash, { backgroundColor: colors.textMuted }]} />
        ))}
      </View>
      <View
        style={[
          styles.averageLabel,
          { top: labelTop, backgroundColor: withAlpha(colors.background, 0.9) },
        ]}>
        <Text variant="footnote" weight="semibold" color="textMuted" numberOfLines={1}>
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  bars: { flexDirection: 'row', alignItems: 'stretch' },
  bar: { flex: 1, justifyContent: 'flex-end', overflow: 'hidden' },
  fill: { width: '100%' },
  labels: { flexDirection: 'row' },
  label: { flex: 1, textAlign: 'center' },
  dashes: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    flexDirection: 'row',
    gap: 3,
    overflow: 'hidden',
  },
  dash: { width: 3, height: 1 },
  averageLabel: {
    position: 'absolute',
    right: 0,
    height: LABEL_HEIGHT,
    paddingHorizontal: 6,
    borderRadius: LABEL_HEIGHT / 2,
    justifyContent: 'center',
  },
});
