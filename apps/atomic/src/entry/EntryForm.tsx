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
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { repeats, type Repeat } from '../choices';
import { Field } from '../components/Field';
import { categoryOf, pickable, useData } from '../data/DataProvider';
import { formatMoney } from '../format';
import { useNow } from '../useNow';
import { frequentEntries, type Frequent } from './frequent';

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
  const { categories, transactions, settings, write } = useData();
  const toast = useToast();

  const [kind, setKind] = useState<Kind>(editing?.kind ?? 'expense');
  const [text, setText] = useState(editing ? String(fromCents(editing.amount)) : '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [step, setStep] = useState<'amount' | 'category'>('amount');
  const [repeat, setRepeat] = useState<Repeat>('never');

  const cents = parseCents(text) ?? 0;

  const now = useNow();
  const frequent = useMemo(
    () => (editing ? [] : frequentEntries(transactions, categories, kind, now.getTime())),
    [editing, transactions, categories, kind, now]
  );

  async function record(entry: Frequent) {
    await write((store) => store.addTransaction({ ...entry, at: Date.now() }));

    toast({ text: kind === 'expense' ? 'Gasto guardado' : 'Ingreso guardado', tone: 'success' });
    onDone();
  }

  async function save(categoryId: string) {
    const fields = { kind, amount: cents, categoryId, note: note.trim() };

    // A new recurring transaction records its first occurrence now.
    await write((store) => {
      if (editing) return store.updateTransaction({ ...editing, ...fields });
      if (repeat === 'never') return store.addTransaction({ ...fields, at: Date.now() });

      return store.addRecurring({ ...fields, every: repeat, start: Date.now() });
    });

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

        {frequent.length > 0 && (
          <View style={styles.frequent}>
            {frequent.map((entry) => {
              const category = categoryOf(categories, entry.categoryId);
              const name = entry.note || category.name;
              const amount = formatMoney(entry.amount, settings.currency);

              return (
                <Button
                  key={`${entry.amount}|${entry.categoryId}|${entry.note}`}
                  label={`${category.emoji} ${name} · ${amount}`}
                  variant="secondary"
                  size="small"
                  onPress={() => void record(entry)}
                />
              );
            })}
          </View>
        )}

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

      {editing ? null : (
        <Field label="Repetir">
          <SegmentedControl segments={repeats} value={repeat} onChange={setRepeat} />
        </Field>
      )}

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
  frequent: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm },
  note: {
    borderRadius: radii.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
});
