import { StyleSheet, View } from 'react-native';
import type { TextVariant } from '../theme/typography';
import { textVariants } from '../theme/typography';
import { amountParts, type AmountFormat } from './amountParts';
import { Text, type ColorName } from './Text';

export type AmountTone = 'default' | 'income' | 'expense' | 'muted';

export type AmountProps = AmountFormat & {
  value: number;
  variant?: TextVariant;
  tone?: AmountTone;
};

const toneColor: Record<AmountTone, ColorName> = {
  default: 'text',
  income: 'income',
  expense: 'danger',
  muted: 'textMuted',
};

/**
 * A money value. At `amount` size and above, the sign and symbol are drawn
 * small and grey before the digits; smaller sizes keep them inline.
 */
export function Amount({ value, variant = 'body', tone = 'default', ...format }: AmountProps) {
  const { sign, symbol, number } = amountParts(value, format);
  const color = toneColor[tone];
  const label = `${sign}${symbol} ${number}`;
  const large = textVariants[variant].fontSize >= textVariants.amount.fontSize;

  if (!large) {
    return (
      <Text variant={variant} weight="medium" color={color} tabular accessibilityLabel={label}>
        {`${sign}${symbol} ${number}`}
      </Text>
    );
  }

  const prefixVariant: TextVariant = variant === 'display' ? 'title' : 'title3';
  return (
    <View style={styles.row} accessible accessibilityLabel={label}>
      <Text variant={prefixVariant} color={tone === 'default' ? 'textMuted' : color} tabular>
        {`${sign}${symbol}`}
      </Text>
      <Text variant={variant} color={color} tabular>
        {number}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
});
