import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text as NativeText, View } from 'react-native';
import { radii, space } from '../theme/layout';
import { useTheme } from '../theme/ThemeProvider';
import type { AmountFormat } from './amountParts';
import { Amount } from './Amount';
import { BudgetMeter, type MeterSegment } from './BudgetMeter';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

type ResultWords = {
  /** The word after the difference while money is left. */
  leftWord?: string;
  /** The word after the difference once the budget is over. */
  overWord?: string;
};

export type BudgetCardProps = ResultWords & {
  name: string;
  emoji: string;
  color: string;
  spent: number;
  amount: number;
  /** The elapsed part of the period, from 0 to 1, drawn as the pace tick. */
  tick?: number;
  /** One line under the difference, such as what is left per day. */
  status?: string;
  format?: Omit<AmountFormat, 'sign'>;
  onPress?: () => void;
  onLongPress?: () => void;
};

/** One category's budget: what is left or over, a status line and its meter. */
export function BudgetCard({
  name,
  emoji,
  color,
  spent,
  amount,
  tick,
  status,
  format,
  onPress,
  onLongPress,
  leftWord = 'restante',
  overWord = 'excedido',
}: BudgetCardProps) {
  const { colors } = useTheme();

  const difference = amount - spent;
  const over = difference < 0;
  const interactive = !!(onPress || onLongPress);

  return (
    <PressableScale
      accessibilityLabel={name}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!interactive}
      feedback={interactive ? 'light' : false}
      scaleTo={0.98}
      style={[styles.card, styles.tile, { backgroundColor: colors.card }]}>
      <View style={styles.title}>
        <NativeText style={styles.emoji} allowFontScaling={false}>
          {emoji}
        </NativeText>
        <Text variant="body" weight="semibold" numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        {over ? (
          <Ionicons
            name="alert-circle"
            size={20}
            color={colors.danger}
            accessibilityLabel="Excedido"
          />
        ) : null}
      </View>
      <View style={styles.result}>
        <Amount
          value={Math.abs(difference)}
          variant="title2"
          tone={over ? 'expense' : 'default'}
          sign="never"
          {...format}
        />
        <Text variant="subheadline" weight="medium" color="textMuted">
          {over ? overWord : leftWord}
        </Text>
      </View>
      {status ? (
        <Text variant="footnote" color="textMuted" numberOfLines={1}>
          {status}
        </Text>
      ) : null}
      <View style={styles.meterTile}>
        <BudgetMeter
          segments={[{ key: 'spent', share: amount > 0 ? spent / amount : 1, color }]}
          tick={tick}
          height={10}
          label={name}
        />
      </View>
    </PressableScale>
  );
}

export type BudgetSummaryCardProps = ResultWords & {
  title?: string;
  /** Short text at the title's trailing edge, such as the period. */
  trailing?: string;
  spent: number;
  amount: number;
  /** Each category's part of the total budget, in the category color. */
  segments: readonly MeterSegment[];
  tick?: number;
  status?: string;
  format?: Omit<AmountFormat, 'sign'>;
};

/** The overall budget: the large difference, a meter split by category and a status line. */
export function BudgetSummaryCard({
  title = 'General',
  trailing,
  spent,
  amount,
  segments,
  tick,
  status,
  format,
  leftWord = 'restante',
  overWord = 'excedido',
}: BudgetSummaryCardProps) {
  const { colors } = useTheme();

  const difference = amount - spent;
  const over = difference < 0;

  return (
    <View style={[styles.card, styles.summary, { backgroundColor: colors.card }]}>
      <View style={styles.spread}>
        <Text variant="headline">{title}</Text>
        {trailing ? (
          <Text variant="subheadline" color="textMuted">
            {trailing}
          </Text>
        ) : null}
      </View>
      <View style={styles.result}>
        <Amount
          value={Math.abs(difference)}
          variant="amount"
          tone={over ? 'expense' : 'default'}
          sign="never"
          {...format}
        />
        <Text variant="body" weight="medium" color="textMuted">
          {over ? overWord : leftWord}
        </Text>
      </View>
      <View style={styles.meterSummary}>
        <BudgetMeter segments={segments} tick={tick} label={title} />
      </View>
      {status ? (
        <Text variant="subheadline" color="textMuted">
          {status}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, gap: space.xs },
  tile: { paddingTop: 14, paddingHorizontal: 14, paddingBottom: space.lg },
  summary: { padding: space.lg },
  title: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  emoji: { fontSize: 20, lineHeight: 24 },
  name: { flex: 1 },
  result: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  spread: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  meterTile: { paddingTop: space.md },
  meterSummary: { paddingTop: 14, paddingBottom: space.xs },
});
