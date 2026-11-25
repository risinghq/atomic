import { Button, space, Text, SegmentedControl, useTheme, useToast } from '@atomic/ui';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccount } from '../account/AccountProvider';
import { signInError } from '../account/AccountSection';
import type { Provider } from '../account/api';
import { currencies, currencyChoice, weekStartOf, weekStarts } from '../choices';
import { Field } from '../components/Field';
import { useData } from '../data/DataProvider';

const points = [
  'Anota un gasto o un ingreso en dos toques.',
  'Ponle un tope a cada categoría y mira cuánto te queda.',
  'Mira a dónde se va tu dinero cada semana, mes o año.',
];

/**
 * The one screen before the first use: what the app does, the currency and
 * the first day of the week, or a sign-in that brings them from the account.
 */
export function Onboarding() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, write } = useData();
  const account = useAccount();
  const toast = useToast();

  const [currency, setCurrency] = useState(currencyChoice(settings.currency));
  const [weekStart, setWeekStart] = useState(String(settings.weekStart) as '0' | '1');
  const [busy, setBusy] = useState(false);

  function start() {
    void write((store) =>
      store.updateSettings({ onboarded: true, currency, weekStart: weekStartOf(weekStart) })
    );
  }

  async function signIn(provider: Provider) {
    setBusy(true);

    try {
      const result = await account.signIn(provider);

      // An account that already holds data brings its own currency and week start.
      if (result === 'returning') await write((store) => store.updateSettings({ onboarded: true }));
      if (result === 'new') start();
    } catch (error) {
      toast({ text: signInError(error), tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const offerSignIn = account.supported && account.email === null;

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.screen,
        { paddingTop: insets.top + space.xxxl, paddingBottom: insets.bottom + space.xl },
      ]}>
      <View style={styles.intro}>
        <Text style={styles.emoji}>🪙</Text>
        <Text variant="largeTitle" weight="bold" style={styles.centered}>
          Bienvenido a Atomic
        </Text>
        <Text variant="body" color="textMuted" style={styles.centered}>
          Una forma simple de llevar tus gastos.
        </Text>
      </View>

      <View style={styles.points}>
        {points.map((point) => (
          <Text key={point} variant="body">
            {`·  ${point}`}
          </Text>
        ))}
      </View>

      <View style={styles.choices}>
        <Field label="Moneda">
          <SegmentedControl segments={currencies} value={currency} onChange={setCurrency} />
        </Field>

        <Field label="La semana empieza el">
          <SegmentedControl segments={weekStarts} value={weekStart} onChange={setWeekStart} />
        </Field>
      </View>

      <View style={styles.actions}>
        <Button label="Empezar" onPress={start} disabled={busy} />

        {offerSignIn ? (
          <>
            <Text variant="footnote" color="textMuted" style={styles.centered}>
              Con una cuenta, tus datos se guardan en la nube y pasan a tus otros dispositivos.
            </Text>
            <Button
              label="Continuar con Google"
              variant="secondary"
              onPress={() => void signIn('google')}
              disabled={busy}
            />
            <Button
              label="Continuar con GitHub"
              variant="secondary"
              onPress={() => void signIn('github')}
              disabled={busy}
            />
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    paddingHorizontal: space.xl,
    justifyContent: 'space-between',
    gap: space.xxl,
  },
  intro: { alignItems: 'center', gap: space.md },
  emoji: { fontSize: 64, lineHeight: 76 },
  centered: { textAlign: 'center' },
  points: { gap: space.sm },
  choices: { gap: space.xl },
  actions: { gap: space.md },
});
