import { Button, radii, SegmentedControl, space, textStyle, useTheme } from '@rising/ui';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Field } from './components/Field';
import type { Intent } from './data/FocoProvider';

const budgets = [
  { value: 'none', label: 'Sin límite' },
  { value: '15', label: '15 min' },
  { value: '25', label: '25 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '1 h' },
] as const;

type BudgetChoice = (typeof budgets)[number]['value'];

/** Asks what the person will do and, optionally, for how long. */
export function FocusForm({ onSubmit }: { onSubmit: (intent: Intent) => void }) {
  const { colors } = useTheme();
  const [label, setLabel] = useState('');
  const [budget, setBudget] = useState<BudgetChoice>('none');

  const submit = () => onSubmit({ label, budget: budget === 'none' ? null : Number(budget) });

  return (
    <View style={styles.form}>
      <Field label="Tarea">
        <TextInput
          accessibilityLabel="Tarea"
          value={label}
          onChangeText={setLabel}
          placeholder="Correo, informe, lectura…"
          placeholderTextColor={colors.textMuted}
          maxLength={40}
          returnKeyType="done"
          onSubmitEditing={submit}
          style={[
            styles.input,
            textStyle('body'),
            { backgroundColor: colors.surface, color: colors.text },
          ]}
        />
      </Field>

      <Field label="Tiempo previsto">
        <SegmentedControl
          label="Tiempo previsto"
          segments={budgets}
          value={budget}
          onChange={setBudget}
        />
      </Field>

      <Button label="Listo" onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.xl },
  input: { borderRadius: radii.lg, paddingHorizontal: space.lg, paddingVertical: space.md },
});
