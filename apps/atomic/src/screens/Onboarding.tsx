import { Button, space, Text, SegmentedControl, useTheme } from '@atomic/ui';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { currencies, currencyChoice, weekStartOf, weekStarts } from '../choices';
import { Field } from '../components/Field';
import { useData } from '../data/DataProvider';

/** The one screen before the first use: the currency and the first day of the week. */
export function Onboarding() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, write } = useData();

  const [currency, setCurrency] = useState(currencyChoice(settings.currency));
  const [weekStart, setWeekStart] = useState(String(settings.weekStart) as '0' | '1');

  function start() {
    void write((store) =>
      store.updateSettings({ onboarded: true, currency, weekStart: weekStartOf(weekStart) })
    );
  }

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + space.xxxl,
          paddingBottom: insets.bottom + space.xl,
        },
      ]}>
      <View style={styles.intro}>
        <Text style={styles.emoji}>🪙</Text>
        <Text variant="largeTitle" weight="bold" style={styles.centered}>
          Bienvenido a Atomic
        </Text>
        <Text variant="body" color="textMuted" style={styles.centered}>
          Anota cada gasto en segundos y mira a dónde se va tu dinero.
        </Text>
      </View>

      <View style={styles.choices}>
        <Field label="Moneda">
          <SegmentedControl segments={currencies} value={currency} onChange={setCurrency} />
        </Field>

        <Field label="La semana empieza el">
          <SegmentedControl segments={weekStarts} value={weekStart} onChange={setWeekStart} />
        </Field>
      </View>

      <Button label="Empezar" onPress={start} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: space.xl, justifyContent: 'space-between' },
  intro: { alignItems: 'center', gap: space.md },
  emoji: { fontSize: 64, lineHeight: 76 },
  centered: { textAlign: 'center' },
  choices: { gap: space.xl },
});
