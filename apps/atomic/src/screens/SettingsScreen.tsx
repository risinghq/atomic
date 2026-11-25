import { currencies, currencyChoice, weekStartOf, weekStarts } from '../choices';
import { ListRow, ListSection, SegmentedControl, Sheet, useToast } from '@atomic/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Field } from '../components/Field';
import { Screen } from '../components/Screen';
import { csvName, toCsv } from '../data/csv';
import { useData } from '../data/DataProvider';
import { shareCsv } from '../data/shareCsv';
import { useSheet } from '../useSheet';

/** The currency, the first day of the week, and the export and erasing of the data. */
export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, transactions, categories, write } = useData();
  const toast = useToast();
  const confirmErase = useSheet();

  async function exportCsv() {
    if (transactions.length === 0) {
      toast({ text: 'No hay movimientos para exportar' });
      return;
    }

    try {
      await shareCsv(csvName(new Date()), toCsv(transactions, categories));
    } catch {
      toast({ text: 'No se pudo exportar', tone: 'error' });
    }
  }

  async function eraseAll() {
    confirmErase.hide();

    // Erasing clears the settings too, so onboarding comes back.
    await write(async (store) => {
      await store.eraseAll();
      await store.seedCategories();
    });
  }

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

      <ListSection title="Datos" footer="Los datos solo se guardan en este dispositivo.">
        <ListRow title="Exportar CSV" onPress={() => void exportCsv()} />
        <ListRow title="Borrar todos los datos" destructive onPress={() => confirmErase.show()} />
      </ListSection>

      <Sheet
        visible={confirmErase.open}
        onClose={confirmErase.hide}
        title="¿Borrar todos los datos?"
        bottomInset={insets.bottom}>
        <ListSection footer="Se borran los movimientos, los presupuestos y los ajustes. No se puede deshacer.">
          <ListRow title="Borrar todo" destructive onPress={() => void eraseAll()} />
        </ListSection>
      </Sheet>
    </Screen>
  );
}
