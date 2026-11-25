import { PressableScale, radii, space, Text, useTheme } from '@rising/ui';
import { StyleSheet, View } from 'react-native';
import { Field } from './components/Field';
import type { Schedule } from './plan';

// Monday first, numbered as `Date#getDay` numbers them.
const days = [
  { day: 1, short: 'L', name: 'Lunes' },
  { day: 2, short: 'M', name: 'Martes' },
  { day: 3, short: 'X', name: 'Miércoles' },
  { day: 4, short: 'J', name: 'Jueves' },
  { day: 5, short: 'V', name: 'Viernes' },
  { day: 6, short: 'S', name: 'Sábado' },
  { day: 0, short: 'D', name: 'Domingo' },
];

const step = 30;
const lastMinute = 24 * 60;

export const workdays: Schedule = { days: [1, 2, 3, 4, 5], start: 9 * 60, end: 18 * 60 };

export function hourLabel(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

/** The days and hours chimes may ring. */
export function ScheduleEditor({
  schedule,
  onChange,
}: {
  schedule: Schedule;
  onChange: (schedule: Schedule) => void;
}) {
  const { colors } = useTheme();

  const toggleDay = (day: number) => {
    const chosen = schedule.days.includes(day)
      ? schedule.days.filter((other) => other !== day)
      : [...schedule.days, day];

    onChange({ ...schedule, days: chosen });
  };

  return (
    <View style={styles.editor}>
      <Field label="Días">
        <View style={styles.days}>
          {days.map(({ day, short, name }) => {
            const on = schedule.days.includes(day);

            return (
              <PressableScale
                key={day}
                accessibilityRole="checkbox"
                accessibilityLabel={name}
                accessibilityState={{ checked: on }}
                onPress={() => toggleDay(day)}
                style={[styles.day, { backgroundColor: on ? colors.accent : colors.surface }]}>
                <Text weight="semibold" color={on ? 'onAccent' : 'text'}>
                  {short}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </Field>

      <View style={styles.hours}>
        <Stepper
          label="Desde"
          minutes={schedule.start}
          onChange={(start) => onChange({ ...schedule, start })}
          min={0}
          max={schedule.end - step}
        />
        <Stepper
          label="Hasta"
          minutes={schedule.end}
          onChange={(end) => onChange({ ...schedule, end })}
          min={schedule.start + step}
          max={lastMinute}
        />
      </View>
    </View>
  );
}

function Stepper({
  label,
  minutes,
  onChange,
  min,
  max,
}: {
  label: string;
  minutes: number;
  onChange: (minutes: number) => void;
  min: number;
  max: number;
}) {
  const { colors } = useTheme();

  const button = (sign: -1 | 1) => {
    const next = minutes + sign * step;
    const disabled = next < min || next > max;

    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${sign < 0 ? 'antes' : 'después'}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => onChange(next)}
        style={[styles.step, { backgroundColor: colors.surface, opacity: disabled ? 0.4 : 1 }]}>
        <Text variant="headline">{sign < 0 ? '−' : '+'}</Text>
      </PressableScale>
    );
  };

  return (
    <Field label={label}>
      <View style={styles.stepper}>
        {button(-1)}
        <Text variant="headline" tabular accessibilityLabel={`${label} ${hourLabel(minutes)}`}>
          {hourLabel(minutes)}
        </Text>
        {button(1)}
      </View>
    </Field>
  );
}

const styles = StyleSheet.create({
  editor: { gap: space.lg },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  day: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hours: { flexDirection: 'row', gap: space.xl },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  step: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
