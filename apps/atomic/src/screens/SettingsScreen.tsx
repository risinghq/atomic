import { currencies, currencyChoice, hapticLevels, weekStartOf, weekStarts } from '../choices';
import { ListRow, ListSection, SegmentedControl, Sheet, Toggle, useToast } from '@rising/ui';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountSection } from '../account/AccountSection';
import { useAccount } from '../account/AccountProvider';
import { CategoryManager } from '../categories/CategoryManager';
import { Field } from '../components/Field';
import { Screen } from '../components/Screen';
import { exportChoices, exported, toCsv, type ExportChoice } from '../data/csv';
import { useData } from '../data/DataProvider';
import { shareCsv } from '../data/shareCsv';
import { canLock, unlock } from '../lock/deviceAuth';
import { RecurringList } from '../recurring/RecurringList';
import { useNow } from '../useNow';
import { useSheet } from '../useSheet';

/** The currency, the first day of the week, categories, recurring transactions, haptics, the app lock, the account, and the export and erasing of the data. */
export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, transactions, categories, write } = useData();
  const toast = useToast();
  const confirmErase = useSheet();
  const manageCategories = useSheet();
  const manageRecurring = useSheet();
  const chooseExport = useSheet();
  const now = useNow();
  const account = useAccount();
  const signedIn = account.email !== null;

  async function exportCsv(choice: ExportChoice) {
    const rows = exported(transactions, choice);

    if (rows.length === 0) {
      toast({ text: 'No hay movimientos para exportar' });
      return;
    }

    chooseExport.hide();

    try {
      await shareCsv(choice.file, toCsv(rows, categories));
    } catch {
      toast({ text: 'No se pudo exportar', tone: 'error' });
    }
  }

  // Turning the lock on asks for the screen lock once, so nobody locks out a device they cannot unlock.
  async function setLock(on: boolean) {
    if (on && !(await canLock())) {
      toast({ text: 'Configura un bloqueo de pantalla en tu dispositivo.', tone: 'error' });
      return;
    }

    if (on && !(await unlock())) return;

    await write((store) => store.updateSettings({ lock: on }));
  }

  async function eraseAll() {
    confirmErase.hide();

    // The account goes first: if the device erased alone, the next sync would bring it all back.
    try {
      await account.eraseCloud();
    } catch {
      toast({ text: 'No se pudo borrar. Revisa tu conexión.', tone: 'error' });
      return;
    }

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

      {Platform.OS === 'web' ? null : (
        <Field label="Vibración">
          <SegmentedControl
            segments={hapticLevels}
            value={settings.haptics}
            onChange={(haptics) => void write((store) => store.updateSettings({ haptics }))}
          />
        </Field>
      )}

      <ListSection>
        <ListRow title="Categorías" onPress={() => manageCategories.show()} />
        <ListRow title="Recurrentes" onPress={() => manageRecurring.show()} />
        {Platform.OS === 'web' ? null : (
          <ListRow
            title="Bloquear la app"
            trailing={
              <Toggle
                label="Bloquear la app"
                value={settings.lock}
                onChange={(on) => void setLock(on)}
              />
            }
          />
        )}
      </ListSection>

      <AccountSection />

      <ListSection
        title="Datos"
        footer={
          signedIn
            ? 'Los datos se guardan en este dispositivo y en tu cuenta.'
            : 'Los datos solo se guardan en este dispositivo.'
        }>
        <ListRow title="Exportar CSV" onPress={() => chooseExport.show()} />
        <ListRow title="Borrar todos los datos" destructive onPress={() => confirmErase.show()} />
      </ListSection>

      <Sheet
        visible={manageCategories.open}
        onClose={manageCategories.hide}
        title="Categorías"
        bottomInset={insets.bottom}>
        <CategoryManager key={manageCategories.session} />
      </Sheet>

      <Sheet
        visible={manageRecurring.open}
        onClose={manageRecurring.hide}
        title="Recurrentes"
        bottomInset={insets.bottom}>
        <RecurringList key={manageRecurring.session} />
      </Sheet>

      <Sheet
        visible={chooseExport.open}
        onClose={chooseExport.hide}
        title="Exportar CSV"
        bottomInset={insets.bottom}>
        <ListSection>
          {exportChoices(now, settings.weekStart).map((choice) => (
            <ListRow
              key={choice.file}
              title={choice.title}
              value={choice.detail}
              onPress={() => void exportCsv(choice)}
            />
          ))}
        </ListSection>
      </Sheet>

      <Sheet
        visible={confirmErase.open}
        onClose={confirmErase.hide}
        title="¿Borrar todos los datos?"
        bottomInset={insets.bottom}>
        <ListSection
          footer={
            signedIn
              ? 'Se borran los movimientos, los recurrentes, los presupuestos y los ajustes de este dispositivo y de tu cuenta. No se puede deshacer.'
              : 'Se borran los movimientos, los recurrentes, los presupuestos y los ajustes. No se puede deshacer.'
          }>
          <ListRow title="Borrar todo" destructive onPress={() => void eraseAll()} />
        </ListSection>
      </Sheet>
    </Screen>
  );
}
