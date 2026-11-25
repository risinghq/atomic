import { Ionicons } from '@expo/vector-icons';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { haptic, type HapticKind } from '../theme/haptics';
import { radii, space } from '../theme/layout';
import { durations, springs } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

export type ToastTone = 'neutral' | 'success' | 'error';

export type ToastMessage = { text: string; tone?: ToastTone };

type ShowToast = (message: ToastMessage) => void;

const ToastContext = createContext<ShowToast | null>(null);

/** The default milliseconds a toast stays before it leaves on its own. */
export const TOAST_DURATION = 2500;

const icons: Record<ToastTone, ComponentProps<typeof Ionicons>['name'] | null> = {
  neutral: null,
  success: 'checkmark-circle',
  error: 'alert-circle',
};

const toneHaptics: Record<ToastTone, HapticKind> = {
  neutral: 'light',
  success: 'success',
  error: 'error',
};

export function ToastProvider({
  children,
  bottomOffset = 96,
  duration = TOAST_DURATION,
}: {
  children: ReactNode;
  /** Distance from the bottom edge, so the toast clears the tab bar. */
  bottomOffset?: number;
  /** Milliseconds a toast stays before it leaves. */
  duration?: number;
}) {
  const [message, setMessage] = useState<(ToastMessage & { id: number }) | null>(null);
  const nextId = useRef(0);

  const show = useCallback<ShowToast>((next) => {
    haptic(toneHaptics[next.tone ?? 'neutral']);
    nextId.current += 1;
    setMessage({ ...next, id: nextId.current });
  }, []);
  // Stable, so a provider re-render does not restart the toast's timer.
  const hide = useCallback(() => setMessage(null), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message ? (
        <ToastView
          key={message.id}
          message={message}
          bottomOffset={bottomOffset}
          duration={duration}
          onHidden={hide}
        />
      ) : null}
    </ToastContext.Provider>
  );
}

/** Returns `show(message)`. Must be called under a ToastProvider. */
export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast must be called inside a ToastProvider');
  return show;
}

function ToastView({
  message,
  bottomOffset,
  duration,
  onHidden,
}: {
  message: ToastMessage;
  bottomOffset: number;
  duration: number;
  onHidden: () => void;
}) {
  const { colors } = useTheme();
  const shown = useSharedValue(0);
  const tone = message.tone ?? 'neutral';
  const icon = icons[tone];

  useEffect(() => {
    shown.value = withSpring(1, springs.smooth);
    const timer = setTimeout(() => {
      shown.value = withTiming(0, { duration: durations.base }, (finished) => {
        if (finished) runOnJS(onHidden)();
      });
    }, duration);
    return () => clearTimeout(timer);
  }, [shown, duration, onHidden]);

  const style = useAnimatedStyle(
    () => ({
      opacity: shown.value,
      transform: [{ translateY: (1 - shown.value) * 24 }, { scale: 0.96 + shown.value * 0.04 }],
    }),
    [shown]
  );

  return (
    <View pointerEvents="none" style={[styles.layer, { bottom: bottomOffset }]}>
      <Animated.View
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[styles.toast, { backgroundColor: colors.accent }, style]}>
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={tone === 'error' ? colors.danger : colors.income}
          />
        ) : null}
        <Text variant="subheadline" weight="medium" color="onAccent">
          {message.text}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radii.full,
    maxWidth: '90%',
  },
});
