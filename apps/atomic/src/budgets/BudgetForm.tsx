import { fromCents, parseCents, type Budget, type BudgetPeriod } from '@rising/core';
import {
  Amount,
  applyKey,
  CategoryPicker,
  NumberPad,
  SegmentedControl,
  space,
  Text,
  tints,
  useToast,
  type CategoryOption,
} from '@rising/ui';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { pickable, useData } from '../data/DataProvider';

const periods = [
  { value: 'week', label: 'Semanal' },
  { value: 'month', label: 'Mensual' },
] as const;

/** The picker's stand-in for the overall budget, whose `categoryId` is null. */
const overall: CategoryOption = { id: 'overall', name: 'General', emoji: '🧮', color: tints.blue };

/**
 * Creates or edits a budget: first what it covers, the whole month or one
 * category, then its period and amount. Editing starts at the amount.
 */
export function BudgetForm({ editing, onDone }: { editing?: Budget; onDone: () => void }) {
  const { budgets, categories, settings, write } = useData();
  const toast = useToast();

  const [target, setTarget] = useState<string | null | undefined>(
    editing ? editing.categoryId : undefined
  );
  const [period, setPeriod] = useState<BudgetPeriod>(editing?.period ?? 'month');
  const [text, setText] = useState(editing ? String(fromCents(editing.amount)) : '');

  const cents = parseCents(text) ?? 0;

  async function save(categoryId: string | null) {
    await write((store) => store.setBudget({ categoryId, amount: cents, period }));
    toast({ text: 'Presupuesto guardado', tone: 'success' });
    onDone();
  }

  if (target === undefined) {
    const taken = new Set(budgets.map((budget) => budget.categoryId ?? overall.id));
    const options = [overall, ...pickable(categories, 'expense')].filter(
      (option) => !taken.has(option.id)
    );

    return (
      <CategoryPicker
        categories={options}
        onSelect={(id) => setTarget(id === overall.id ? null : id)}
      />
    );
  }

  const covered =
    target === null ? overall : (categories.find((category) => category.id === target) ?? overall);

  return (
    <View style={styles.form}>
      <View style={styles.center}>
        <Text variant="headline" weight="semibold">
          {`${covered.emoji} ${covered.name}`}
        </Text>
        <SegmentedControl segments={periods} value={period} onChange={setPeriod} />
      </View>

      <View style={styles.amount}>
        <Amount
          value={fromCents(cents)}
          currency={settings.currency}
          variant="display"
          sign="never"
          tone={text ? 'default' : 'muted'}
        />
      </View>

      <NumberPad
        onKey={(key) => setText((current) => applyKey(current, key))}
        canConfirm={cents > 0}
        onConfirm={() => void save(target)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  center: { alignItems: 'center', gap: space.md },
  amount: { alignItems: 'center', paddingVertical: space.md },
});
