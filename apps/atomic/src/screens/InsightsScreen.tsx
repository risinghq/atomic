import {
  bucketsOf,
  fromCents,
  periodOf,
  samePeriod,
  shiftPeriod,
  totalIn,
  totalsByBucket,
  totalsByCategory,
  type Kind,
  type PeriodKind,
} from '@rising/core';
import {
  Amount,
  BarChart,
  EmptyState,
  IconTile,
  ListRow,
  ListSection,
  PeriodPicker,
  SegmentedControl,
  space,
  Text,
  useTheme,
  type ChartBar,
} from '@rising/ui';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Screen } from '../components/Screen';
import { categoryOf, useData } from '../data/DataProvider';
import { bucketLabel, formatMoney, periodTitle } from '../format';
import { useNow } from '../useNow';

const periodKinds = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'year', label: 'Año' },
] as const;

const kinds = [
  { value: 'expense', label: 'Gastos' },
  { value: 'income', label: 'Ingresos' },
] as const;

/** One period's total, a bar per day or month, and the split by category. */
export function InsightsScreen() {
  const { colors } = useTheme();
  const { transactions, categories, settings } = useData();

  const [periodKind, setPeriodKind] = useState<PeriodKind>('week');
  const [kind, setKind] = useState<Kind>('expense');
  const [offset, setOffset] = useState(0);

  const now = useNow();
  const current = periodOf(periodKind, now, settings.weekStart);
  const period = shiftPeriod(current, offset);
  const total = totalIn(transactions, period, kind);

  const buckets = bucketsOf(period);
  const totals = totalsByBucket(transactions, buckets, kind);
  const bars: ChartBar[] = buckets.map((bucket, index) => ({
    key: String(bucket.start.getTime()),
    label: bucketLabel(bucket, periodKind),
    value: fromCents(totals[index] ?? 0),
    current: bucket.start <= now && now < bucket.end,
    future: bucket.start > now,
  }));
  const elapsed = bars.filter((bar) => !bar.future).length;

  const byCategory = totalsByCategory(transactions, period, kind);

  function choosePeriodKind(next: PeriodKind) {
    setPeriodKind(next);
    setOffset(0);
  }

  return (
    <Screen title="Resumen">
      <View style={styles.controls}>
        <SegmentedControl segments={periodKinds} value={periodKind} onChange={choosePeriodKind} />
        <SegmentedControl segments={kinds} value={kind} onChange={setKind} />
      </View>

      <PeriodPicker
        title={periodTitle(period, now, settings.weekStart)}
        onPrevious={() => setOffset((value) => value - 1)}
        onNext={() => setOffset((value) => value + 1)}
        canNext={!samePeriod(period, current)}
      />

      <View style={styles.total}>
        <Text variant="caption" weight="semibold" color="textMuted">
          {kind === 'expense' ? 'GASTASTE' : 'RECIBISTE'}
        </Text>
        <Amount
          value={fromCents(total)}
          currency={settings.currency}
          variant="amount"
          sign="never"
        />
      </View>

      <BarChart
        bars={bars}
        average={elapsed > 0 ? fromCents(total) / elapsed : 0}
        formatValue={(value) => formatMoney(Math.round(value * 100), settings.currency)}
        color={kind === 'income' ? colors.income : undefined}
      />

      {byCategory.length === 0 ? (
        <EmptyState
          emoji="📊"
          title="Sin movimientos"
          message={
            kind === 'expense'
              ? 'No registraste gastos en este periodo.'
              : 'No registraste ingresos en este periodo.'
          }
        />
      ) : (
        <ListSection title="Por categoría">
          {byCategory.map(({ categoryId, total: categoryTotal }) => {
            const category = categoryOf(categories, categoryId);
            const share = Math.round((categoryTotal / total) * 100);

            return (
              <ListRow
                key={categoryId}
                title={category.name}
                subtitle={`${share}%`}
                leading={<IconTile icon={category.emoji} color={category.color} />}
                value={formatMoney(categoryTotal, settings.currency)}
              />
            );
          })}
        </ListSection>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { gap: space.sm },
  total: { alignItems: 'center', gap: space.xs },
});
