import { fromCents, parseCents, type Kind, type Transaction } from '@atomic/core';
import {
  Amount,
  applyKey,
  Button,
  CategoryPicker,
  NumberPad,
  radii,
  SegmentedControl,
  space,
  textStyle,
  useTheme,
  useToast,
} from '@atomic/ui';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { pickable, useData } from '../data/DataProvider';
import { formatMoney } from '../format';

const kinds = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
] as const;

/**
 * Records or edits one transaction in two steps: the amount on the number pad,
 * then a category. Tapping the category saves, so a new expense takes the
 * amount's keys plus two taps.
 */
export function EntryForm({ editing, onDone }: { editing?: Transaction; onDone: () => void }) {
  const { colors } = useTheme();
  const { categories, settings, write } = useData();
  const toast = useToast();

  const [kind, setKind] = useState<Kind>(editing?.kind ?? 'expense');
  const [text, setText] = useState(editing ? String(fromCents(editing.amount)) : '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [step, setStep] = useState<'amount' | 'category'>('amount');

  const cents = parseCents(text) ?? 0;

  async function save(categoryId: string) {
    const fields = { kind, amount: cents, categoryId, note: note.trim() };

    await write((store) =>
      editing
        ? store.updateTransaction({ ...editing, ...fields })
        : store.addTransaction({ ...fields, at: Date.now() })
    );

    toast({ text: kind === 'expense' ? 'Gasto guardado' : 'Ingreso guardado', tone: 'success' });
    onDone();
  }

  if (step === 'amount') {
    return (
      <View style={styles.form}>
        <View style={styles.center}>
          <SegmentedControl segments={kinds} value={kind} onChange={setKind} />
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
          onConfirm={() => setStep('category')}
        />
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <View style={styles.center}>
        <Button
          label={formatMoney(cents, settings.currency)}
          variant="secondary"
          size="small"
          icon={<Ionicons name="chevron-back" size={16} color={colors.text} />}
          onPress={() => setStep('amount')}
        />
      </View>

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Nota (opcional)"
        placeholderTextColor={colors.textMuted}
        returnKeyType="done"
        maxLength={80}
        style={[
          styles.note,
          textStyle('body'),
          { backgroundColor: colors.surface, color: colors.text },
        ]}
      />

      <CategoryPicker
        categories={pickable(categories, kind)}
        selected={editing?.kind === kind ? editing.categoryId : undefined}
        onSelect={(id) => void save(id)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  center: { alignItems: 'center' },
  amount: { alignItems: 'center', paddingVertical: space.md },
  note: {
    borderRadius: radii.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
});
