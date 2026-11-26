import { ListRow, ListSection, SegmentedControl, space, Toggle } from '@rising/ui';
import { StyleSheet, View } from 'react-native';
import { speakNow, voiceSupported } from '../chimes';
import { intervalChoice, intervals } from '../choices';
import { Field } from '../components/Field';
import { Screen } from '../components/Screen';
import { useFoco } from '../data/FocoProvider';
import { ScheduleEditor, workdays } from '../ScheduleEditor';

/** How often the chimes come, whether they speak, and when they may ring. */
export function SettingsScreen() {
  const { settings, changePlan } = useFoco();

  return (
    <Screen title="Ajustes">
      <ListSection title="Avisos">
        <View style={styles.inset}>
          <Field label="Cada">
            <SegmentedControl
              label="Cada"
              segments={intervals}
              value={intervalChoice(settings.interval)}
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
      </ListSection>

      <ListSection title="Horario">
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

const styles = StyleSheet.create({
  inset: { paddingHorizontal: space.lg, paddingVertical: space.md },
});
