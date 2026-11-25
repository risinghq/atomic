import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type HapticKind = 'selection' | 'light' | 'medium' | 'success' | 'warning' | 'error';

/** None, only the outcome of an action, or also every switch and press. */
export type HapticLevel = 'off' | 'essential' | 'all';

const outcomes: ReadonlySet<HapticKind> = new Set(['success', 'warning', 'error']);

function play(kind: HapticKind): Promise<void> {
  switch (kind) {
    case 'selection':
      return Haptics.selectionAsync();
    case 'light':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    case 'medium':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    case 'success':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    case 'warning':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    case 'error':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}

let level: HapticLevel = 'essential';

/** Sets which haptics play; the app sets it from the user's setting. */
export function setHapticLevel(next: HapticLevel): void {
  level = next;
}

function plays(kind: HapticKind): boolean {
  if (level === 'all') return true;

  return level === 'essential' && outcomes.has(kind);
}

/**
 * Plays a haptic the level allows and never throws: a device without a haptic
 * engine, or the web, feels nothing.
 */
export function haptic(kind: HapticKind = 'light'): void {
  if (!plays(kind) || Platform.OS === 'web') return;

  play(kind).catch(() => {});
}
