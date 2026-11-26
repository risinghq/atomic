import { Button, ProgressBar, radii, space, Text, useTheme } from '@rising/ui';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { screenPadding } from '../components/Screen';
import { useFoco } from '../data/FocoProvider';
import { chimeTimes, clockTime, elapsed, type Focus } from '../plan';
import { useMinute } from '../useMinute';

/** The clock at the center, what is running under it, and the one action that fits. */
export function NowScreen({ onStart, onSwitch }: { onStart: () => void; onSwitch: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, stop } = useFoco();
  const now = useMinute();
  const next = settings.active ? chimeTimes(settings, now, 1, () => 0.5)[0] : undefined;

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.background, paddingTop: insets.top + space.lg },
      ]}>
      <View style={styles.hero}>
        {settings.active && settings.focus?.label ? <Pill label={settings.focus.label} /> : null}

        <Text variant="hero" tabular accessibilityRole="header">
          {clockTime(now)}
        </Text>

        {settings.active ? (
          <Progress focus={settings.focus} now={now} />
        ) : (
          <Text color="textMuted">
            {settings.jitter
              ? `Avisos cerca de cada ${settings.interval} min`
              : `Avisos cada ${settings.interval} min`}
          </Text>
        )}

        {settings.active && next !== undefined && !settings.jitter ? (
          <Text variant="footnote" color="textMuted">
            {`Próximo aviso a las ${clockTime(next)}`}
          </Text>
        ) : null}
      </View>

      {settings.active ? (
        <View style={styles.actions}>
          <Button label="Cambiar" variant="secondary" onPress={onSwitch} style={styles.action} />
          <Button
            label="Detener"
            variant="plain"
            onPress={() => void stop()}
            style={styles.action}
          />
        </View>
      ) : (
        <Button label="Empezar" onPress={onStart} />
      )}
    </View>
  );
}

function Pill({ label }: { label: string }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.pill, { backgroundColor: colors.surface }]}>
      <Text variant="subheadline" weight="medium" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Minutes spent, against the timebox when there is one. */
function Progress({ focus, now }: { focus: Focus | null; now: number }) {
  const { colors } = useTheme();
  const spent = focus ? elapsed(focus.since, now) : 0;
  const budget = focus?.budget ?? null;
  const over = budget !== null && spent > budget;

  return (
    <>
      <Text color={over ? 'overBudget' : 'textMuted'} tabular>
        {budget === null
          ? `${spent} min`
          : over
            ? `${spent - budget} min más de lo previsto`
            : `${spent} de ${budget} min`}
      </Text>
      {budget !== null && (
        <View style={styles.bar}>
          <ProgressBar
            progress={spent / budget}
            color={over ? colors.overBudget : undefined}
            label="Tiempo previsto"
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: screenPadding, paddingBottom: space.xl },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  pill: {
    borderRadius: radii.full,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    maxWidth: '100%',
  },
  bar: { alignSelf: 'stretch', marginHorizontal: space.xxxl, marginTop: space.sm },
  actions: { flexDirection: 'row', gap: space.md },
  action: { flex: 1 },
});
