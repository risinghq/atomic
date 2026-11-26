import { Button, ListRow, SegmentedControl, space, Text, Toggle, useTheme } from '@rising/ui';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { allowChimes, voiceSupported } from '../chimes';
import { intervalChoice, intervals } from '../choices';
import { Field } from '../components/Field';
import { useFoco } from '../data/FocoProvider';

const points = [
  'Un aviso cada pocos minutos te dice la hora y en qué estabas.',
  'Ponle nombre y tiempo a lo que haces, o solo empieza.',
  'Al final del día, mira en qué se fue tu tiempo.',
];

/**
 * The one screen before the first use: what the app does, how often it
 * chimes, and whether it speaks. Leaving it asks for notifications.
 */
export function Onboarding() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, finishOnboarding } = useFoco();

  const [every, setEvery] = useState(intervalChoice(settings.interval));
  const [voice, setVoice] = useState(settings.voice);
  const [busy, setBusy] = useState(false);

  async function finish() {
    setBusy(true);
    await allowChimes();
    await finishOnboarding({ interval: Number(every), voice });
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.screen,
        { paddingTop: insets.top + space.xxxl, paddingBottom: insets.bottom + space.xl },
      ]}>
      <View style={styles.intro}>
        <Text style={styles.emoji}>💡</Text>
        <Text variant="largeTitle" weight="bold" style={styles.centered}>
          Bienvenido a Foco
        </Text>
        <Text variant="body" color="textMuted" style={styles.centered}>
          Avisos suaves que te devuelven a lo que querías hacer.
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
        <Field label="Avisar cada">
          <SegmentedControl label="Cada" segments={intervals} value={every} onChange={setEvery} />
        </Field>

        {voiceSupported && (
          <ListRow
            title="Voz"
            subtitle="Dice la hora en voz alta"
            trailing={<Toggle label="Voz" value={voice} onChange={setVoice} />}
          />
        )}
      </View>

      <View style={styles.actions}>
        <Button label="Continuar" onPress={() => void finish()} disabled={busy} />
        <Text variant="footnote" color="textMuted" style={styles.centered}>
          Foco te pedirá permiso para mostrar avisos. Puedes cambiar todo en Ajustes.
        </Text>
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
