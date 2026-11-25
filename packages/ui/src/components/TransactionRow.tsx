import { StyleSheet, View } from 'react-native';
import { space } from '../theme/layout';
import type { AmountFormat } from './amountParts';
import { Amount } from './Amount';
import { IconTile } from './IconTile';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type TransactionRowProps = {
  title: string;
  /** A short time or note under the title. */
  subtitle?: string;
  emoji: string;
  /** The category tile color. */
  color: string;
  /** Positive for income, negative for an expense. */
  amount: number;
  format?: Omit<AmountFormat, 'sign'>;
  onPress?: () => void;
};

/** One transaction: category tile, title and time, and the signed amount. */
export function TransactionRow({
  title,
  subtitle,
  emoji,
  color,
  amount,
  format,
  onPress,
}: TransactionRowProps) {
  const income = amount > 0;
  return (
    <PressableScale
      accessibilityLabel={title}
      onPress={onPress}
      disabled={!onPress}
      feedback={onPress ? 'light' : false}
      scaleTo={0.98}
      style={styles.row}>
      <IconTile icon={emoji} color={color} size={40} />
      <View style={styles.text}>
        <Text variant="callout" weight="medium" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Amount
        value={amount}
        variant="callout"
        tone={income ? 'income' : 'default'}
        sign={income ? 'always' : 'negative'}
        {...format}
      />
    </PressableScale>
  );
}

export type DayHeaderProps = {
  title: string;
  total: number;
  format?: Omit<AmountFormat, 'sign'>;
};

/** The heading over one day of transactions, with the day's net total. */
export function DayHeader({ title, total, format }: DayHeaderProps) {
  return (
    <View style={styles.header}>
      <Text variant="caption" weight="semibold" color="textMuted" style={styles.headerTitle}>
        {title.toUpperCase()}
      </Text>
      <Amount value={total} variant="caption" tone="muted" sign="always" {...format} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
  },
  text: { flex: 1, gap: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.lg,
    paddingBottom: space.xs,
  },
  headerTitle: { letterSpacing: 0.4 },
});
