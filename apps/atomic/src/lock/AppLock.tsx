import { Button, space, Text, useTheme } from '@rising/ui';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '../data/DataProvider';
import { unlock } from './deviceAuth';

/**
 * How long the app may sit in the background before it locks again. Sharing a
 * CSV, signing in and the system's own PIN screen all leave the app briefly,
 * and none of them should lock it.
 */
export const LOCK_AFTER = 30_000;

/**
 * Covers the app with a lock screen while the lock is on: at a cold start, and
 * on a return from the background after LOCK_AFTER. The app stays mounted
 * under it, so an entry half typed survives.
 */
export function AppLock({ children }: { children: ReactNode }) {
  const { settings } = useData();
  const [locked, setLocked] = useState(settings.lock);
  const lockOn = useRef(settings.lock);
  const leftAt = useRef<number | null>(null);
  const asking = useRef(false);

  lockOn.current = settings.lock;

  const ask = useCallback(async () => {
    if (asking.current) return;
    asking.current = true;

    try {
      if (await unlock()) setLocked(false);
    } finally {
      asking.current = false;
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        leftAt.current = Date.now();
        return;
      }

      if (state !== 'active' || leftAt.current === null) return;

      const away = Date.now() - leftAt.current;
      leftAt.current = null;

      if (lockOn.current && away >= LOCK_AFTER) setLocked(true);
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (locked) void ask();
  }, [locked, ask]);

  return (
    <>
      {children}
      <LockScreen visible={locked} onUnlock={() => void ask()} />
    </>
  );
}

function LockScreen({ visible, onUnlock }: { visible: boolean; onUnlock: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    // A Modal, so it also covers a sheet left open. Back does not dismiss it.
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View
        style={[
          styles.screen,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top + space.xxxl,
            paddingBottom: insets.bottom + space.xl,
          },
        ]}>
        <View style={styles.message}>
          <Text style={styles.emoji}>🔒</Text>
          <Text variant="title3" weight="bold" accessibilityRole="header">
            Atomic está bloqueado
          </Text>
          <Text variant="subheadline" color="textMuted" style={styles.centered}>
            Usa el bloqueo de tu dispositivo para abrirlo.
          </Text>
        </View>

        <Button label="Desbloquear" onPress={onUnlock} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'space-between', paddingHorizontal: space.xl },
  message: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  emoji: { fontSize: 56, lineHeight: 68 },
  centered: { textAlign: 'center' },
});
