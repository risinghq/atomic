import {
  Button,
  ListRow,
  ListSection,
  ProgressBar,
  radii,
  SegmentedControl,
  space,
  Text,
  Toggle,
  useTheme,
} from '@rising/ui';
import { StyleSheet, View } from 'react-native';
import { speakNow, voiceSupported } from '../chimes';
import { Field } from '../components/Field';
import { Screen } from '../components/Screen';
import { useFoco } from '../data/FocoProvider';
import { chimeTimes, clockTime, elapsed, type Focus } from '../plan';
import { ScheduleEditor, workdays } from '../ScheduleEditor';
import { useMinute } from '../useMinute';

const intervals = [
  { value: '5', label: '5 min' },
  { value: '10', label: '10 min' },
  { value: '15', label: '15 min' },
  { value: '25', label: '25 min' },
] as const;

type IntervalChoice = (typeof intervals)[number]['value'];

/** What is running now, and how often the chimes come. */
export function NowScreen({ onStart, onSwitch }: { onStart: () => void; onSwitch: () => void }) {
  const { settings, stop, changePlan } = useFoco();
  const now = useMinute();
  const next = settings.active ? chimeTimes(settings, now, 1, () => 0.5)[0] : undefined;

  return (
    <Screen title="Foco">
      <View style={styles.clock}>
        <Text variant="display" tabular accessibilityRole="header">
          {clockTime(now)}
        </Text>
        {settings.active && (
          <Text color="textMuted">
            {next === undefined || settings.jitter
              ? 'Avisos activos'
              : `Próximo aviso a las ${clockTime(next)}`}
          </Text>
        )}
      </View>

      {settings.active ? (
        <Running focus={settings.focus} now={now} onSwitch={onSwitch} onStop={stop} />
      ) : (
        <Button label="Empezar" onPress={onStart} />
      )}

      <ListSection title="Avisos">
        <View style={styles.inset}>
          <Field label="Cada">
            <SegmentedControl
              label="Cada"
              segments={intervals}
              value={String(settings.interval) as IntervalChoice}
              onChange={(value) => void changePlan({ interval: Number(value) })}
            />
          </Field>
        </View>
        <ListRow
          title="Variable"
          subtitle="A intervalos irregulares"
          trailing={
            <Toggle
              label="Variable"
              value={settings.jitter}
              onChange={(jitter) => void changePlan({ jitter })}
            />
          }
        />
        {voiceSupported && (
          <ListRow
            title="Voz"
            subtitle="Dice la hora en voz alta, salvo en silencio"
            trailing={
              <Toggle
                label="Voz"
                value={settings.voice}
                onChange={(voice) => {
                  void changePlan({ voice });
                  if (voice) void speakNow(settings, Date.now());
                }}
              />
            }
          />
        )}
        <ListRow
          title="Horario"
          subtitle="Avisa solo en los días y horas que elijas"
          trailing={
            <Toggle
              label="Horario"
              value={settings.schedule !== null}
              onChange={(on) => void changePlan({ schedule: on ? workdays : null })}
            />
          }
        />
        {settings.schedule && (
          <View style={styles.inset}>
            <ScheduleEditor
              schedule={settings.schedule}
              onChange={(schedule) => void changePlan({ schedule })}
            />
          </View>
        )}
      </ListSection>
    </Screen>
  );
}

function Running({
  focus,
  now,
  onSwitch,
  onStop,
}: {
  focus: Focus | null;
  now: number;
  onSwitch: () => void;
  onStop: () => Promise<void>;
}) {
  const { colors } = useTheme();
  const spent = focus ? elapsed(focus.since, now) : 0;
  const budget = focus?.budget ?? null;
  const over = budget !== null && spent > budget;

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Text variant="title">{focus?.label || 'Sin tarea'}</Text>
      <Text color={over ? 'overBudget' : 'textMuted'} tabular>
        {budget === null
          ? `${spent} min`
          : over
            ? `${spent - budget} min más de lo previsto`
            : `${spent} de ${budget} min`}
      </Text>
      {budget !== null && (
        <ProgressBar
          progress={spent / budget}
          color={over ? colors.overBudget : undefined}
          label="Tiempo previsto"
        />
      )}
      <View style={styles.actions}>
        <Button label="Cambiar" variant="secondary" onPress={onSwitch} style={styles.action} />
        <Button
          label="Detener"
          variant="plain"
          onPress={() => void onStop()}
          style={styles.action}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clock: { alignItems: 'center', gap: space.xs },
  card: { borderRadius: radii.xl, padding: space.xl, gap: space.md },
  actions: { flexDirection: 'row', gap: space.md, marginTop: space.sm },
  action: { flex: 1 },
  inset: { paddingHorizontal: space.lg, paddingVertical: space.md },
});
