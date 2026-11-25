import type { Transaction } from '@atomic/core';
import { Sheet, TabBar, useTheme, type Tab } from '@atomic/ui';
import { useEffect, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EntryForm } from './entry/EntryForm';
import { BudgetsScreen } from './screens/BudgetsScreen';
import { InsightsScreen } from './screens/InsightsScreen';
import { LogScreen } from './screens/LogScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { useSheet } from './useSheet';

type TabKey = 'log' | 'insights' | 'budgets' | 'settings';

const tabs: Tab<TabKey>[] = [
  { key: 'log', label: 'Registro', icon: 'list-outline', activeIcon: 'list' },
  { key: 'insights', label: 'Resumen', icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
  { key: 'budgets', label: 'Presupuestos', icon: 'grid-outline', activeIcon: 'grid' },
  { key: 'settings', label: 'Ajustes', icon: 'settings-outline', activeIcon: 'settings' },
];

/**
 * The four tabs and the entry sheet. Only the active tab is mounted; each
 * screen reads the shared data, so nothing is lost when it unmounts.
 */
export function Shell() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>('log');
  const entry = useSheet<Transaction>();

  // Android back leaves another tab for Registro before it leaves the app.
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (tab === 'log') return false;

      setTab('log');
      return true;
    });

    return () => subscription.remove();
  }, [tab]);

  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      <View style={styles.screen}>
        {tab === 'log' && <LogScreen onAdd={() => entry.show()} onEdit={entry.show} />}
        {tab === 'insights' && <InsightsScreen />}
        {tab === 'budgets' && <BudgetsScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </View>

      <TabBar
        tabs={tabs}
        active={tab}
        onChange={setTab}
        onAdd={() => entry.show()}
        bottomInset={insets.bottom}
      />

      <Sheet
        visible={entry.open}
        onClose={entry.hide}
        title={entry.value ? 'Editar movimiento' : 'Nuevo movimiento'}
        bottomInset={insets.bottom}>
        <EntryForm key={entry.session} editing={entry.value} onDone={entry.hide} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  screen: { flex: 1 },
});
