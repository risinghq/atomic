import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { radii, space } from '../theme/layout';
import { durations, easings, springs } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Space under the content for the home indicator. */
  bottomInset?: number;
  closeLabel?: string;
  /** Runs once the panel has slid in. Android shows no keyboard for a field focused before then. */
  onShown?: () => void;
  children: ReactNode;
};

/**
 * A panel that slides up from the bottom over a dimmed screen. Tapping the dim
 * closes it. It stays mounted through its exit so it can slide away.
 */
export function Sheet({
  visible,
  onClose,
  title,
  bottomInset = 0,
  closeLabel = 'Cerrar',
  onShown,
  children,
}: SheetProps) {
  const { colors, scheme } = useTheme();
  const { height } = useWindowDimensions();

  const [mounted, setMounted] = useState(visible);
  const shown = useSharedValue(0);

  const onShownRef = useRef(onShown);
  onShownRef.current = onShown;

  useEffect(() => {
    if (visible) {
      setMounted(true);

      const settle = () => onShownRef.current?.();
      shown.value = withSpring(1, springs.smooth, (finished) => {
        if (finished) runOnJS(settle)();
      });

      return undefined;
    }

    shown.value = withTiming(0, { duration: durations.base, easing: easings.exit });
    const timer = setTimeout(() => setMounted(false), durations.base);
    return () => clearTimeout(timer);
  }, [visible, shown]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, shown.value) }), [shown]);
  const panelStyle = useAnimatedStyle(
    () => ({ transform: [{ translateY: (1 - shown.value) * height }] }),
    [shown, height]
  );

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose}>
      {/* Android draws edge to edge, so the window no longer shrinks for the keyboard. */}
      <KeyboardAvoidingView behavior="padding" style={styles.root}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)' },
            backdropStyle,
          ]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          aria-modal
          onAccessibilityEscape={onClose}
          style={[
            styles.panel,
            { backgroundColor: colors.background, paddingBottom: bottomInset + space.lg },
            panelStyle,
          ]}>
          <View style={[styles.grabber, { backgroundColor: colors.track }]} />
          {title ? (
            <Text variant="headline" style={styles.title}>
              {title}
            </Text>
          ) : null}
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  panel: {
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    gap: space.md,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3 },
  title: { textAlign: 'center' },
});
