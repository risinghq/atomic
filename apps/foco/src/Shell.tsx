import { Sheet, TabBar, useTheme, type Tab } from '@rising/ui';
import { useEffect, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { allowChimes } from './chimes';
import { useFoco, type Intent } from './data/FocoProvider';
import { FocusForm } from './FocusForm';
import { NowScreen } from './screens/NowScreen';
import { TodayScreen } from './screens/TodayScreen';
import { useSheet } from './useSheet';
import { useSwitchRequest } from './useSwitchRequest';

type TabKey = 'now' | 'today';

const tabs: Tab<TabKey>[] = [
  { key: 'now', label: 'Ahora', icon: 'timer-outline', activeIcon: 'timer' },
  { key: 'today', label: 'Hoy', icon: 'today-outline', activeIcon: 'today' },
];

type FormKind = 'start' | 'switch';

/** The two tabs and the sheet that asks what comes next. */
export function Shell() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, start, switchTo } = useFoco();
  const [tab, setTab] = useState<TabKey>('now');
  const form = useSheet<FormKind>();

  useSwitchRequest(() => {
    setTab('now');
    form.show(settings.active ? 'switch' : 'start');
  });

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (tab === 'now') return false;

      setTab('now');
      return true;
    });

    return () => subscription.remove();
  }, [tab]);

  const submit = async (intent: Intent) => {
    form.hide();

    if (form.value === 'switch') await switchTo(intent);
    else await start(intent);

    await allowChimes();
  };

  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      <View style={styles.screen}>
        {tab === 'now' && (
          <NowScreen onStart={() => form.show('start')} onSwitch={() => form.show('switch')} />
        )}
        {tab === 'today' && <TodayScreen />}
      </View>

      <TabBar tabs={tabs} active={tab} onChange={setTab} bottomInset={insets.bottom} />

      <Sheet
        visible={form.open}
        onClose={form.hide}
        title={form.value === 'switch' ? '¿A qué cambias?' : '¿En qué vas a estar?'}
        bottomInset={insets.bottom}>
        <FocusForm key={form.session} onSubmit={(intent) => void submit(intent)} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  screen: { flex: 1 },
});
