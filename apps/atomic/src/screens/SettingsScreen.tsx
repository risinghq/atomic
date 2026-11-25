import { currencies, currencyChoice, weekStartOf, weekStarts } from '../choices';
import { SegmentedControl } from '@atomic/ui';
import { Field } from '../components/Field';
import { Screen } from '../components/Screen';
import { useData } from '../data/DataProvider';

/** The currency and the first day of the week. */
export function SettingsScreen() {
  const { settings, write } = useData();

  return (
    <Screen title="Ajustes">
      <Field label="Moneda">
        <SegmentedControl
          segments={currencies}
          value={currencyChoice(settings.currency)}
          onChange={(currency) => void write((store) => store.updateSettings({ currency }))}
        />
      </Field>

      <Field label="La semana empieza el">
        <SegmentedControl
          segments={weekStarts}
          value={String(settings.weekStart) as '0' | '1'}
          onChange={(value) =>
            void write((store) => store.updateSettings({ weekStart: weekStartOf(value) }))
          }
        />
      </Field>
    </Screen>
  );
}
