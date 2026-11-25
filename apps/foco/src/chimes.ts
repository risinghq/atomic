import { requireOptionalNativeModule } from 'expo';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Settings } from './data/store';
import { chimeFor, chimeTimes } from './plan';

/** The category whose actions answer a chime, and the actions in it. */
export const checkin = 'checkin';
export const switchAction = 'cambie';

// iOS keeps at most 64 pending notifications per app. Android allows 500
// alarms, and a longer window keeps chimes coming when the app stays closed.
const windowSize = Platform.OS === 'ios' ? 60 : 144;

export const supported = Platform.OS !== 'web';

interface VoiceModule {
  schedule(times: number[], texts: string[]): Promise<void>;
  speak(text: string): Promise<void>;
}

// The native module in modules/voice exists only in Android builds.
const voice = requireOptionalNativeModule<VoiceModule>('FocoVoice');

export const voiceSupported = voice !== null;

// The voice starts after the notification sound instead of over it.
const voiceDelay = 1500;

/** Registers the channels, the check-in actions and the foreground handler. Call once at start. */
export async function prepareChimes(): Promise<void> {
  if (!supported) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  // A channel's sound and vibration are fixed once created; only its name can change.
  await Notifications.setNotificationChannelAsync('chime', {
    name: 'Avisos',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 120],
  });
  await Notifications.setNotificationChannelAsync('over', {
    name: 'Tiempo cumplido',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 150, 250, 150, 250],
  });

  await Notifications.setNotificationCategoryAsync(checkin, [
    { identifier: 'sigo', buttonTitle: 'Sigo', options: { opensAppToForeground: false } },
    { identifier: switchAction, buttonTitle: 'Cambié', options: { opensAppToForeground: true } },
  ]);
}

/**
 * Asks for notifications and, on Android 14 and later, for exact alarms, which
 * keep a chime on its minute. Resolves to whether chimes can show at all.
 */
export async function allowChimes(): Promise<boolean> {
  if (!supported) return false;

  const current = await Notifications.getPermissionsAsync();
  const allowed = current.granted || (await Notifications.requestPermissionsAsync()).granted;

  if (allowed && Platform.OS === 'android') {
    const exact = await Notifications.getExactAlarmPermissionsAsync();
    if (!exact.granted && exact.canAskAgain)
      await Notifications.requestExactAlarmPermissionsAsync();
  }

  return allowed;
}

/**
 * Replaces every pending chime with the next window of them. The last one in
 * a full window asks the person to open the app, which schedules the next.
 */
export async function scheduleChimes(settings: Settings, now: number): Promise<number> {
  if (!supported) return 0;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const times = settings.active ? chimeTimes(settings, now, windowSize) : [];
  const chimes = times.map((at) => chimeFor(at, settings.focus));

  await voice?.schedule(
    settings.voice ? times.map((at) => at + voiceDelay) : [],
    settings.voice ? chimes.map((chime) => chime.spoken) : []
  );

  for (const [index, chime] of chimes.entries()) {
    const last = chimes.length === windowSize && index === chimes.length - 1;

    // oxlint-disable-next-line no-await-in-loop -- the native scheduler takes one request at a time.
    await Notifications.scheduleNotificationAsync({
      content: {
        title: chime.title,
        body: last ? `${chime.body}\nAbre foco para seguir recibiendo avisos.` : chime.body,
        categoryIdentifier: checkin,
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: chime.at,
        channelId: chime.over ? 'over' : 'chime',
      },
    });
  }

  return chimes.length;
}

/** Speaks the chime for `now` at once, so the person hears the voice they turned on. */
export async function speakNow(settings: Settings, now: number): Promise<void> {
  await voice?.speak(chimeFor(now, settings.focus).spoken);
}

/** Clears chimes already shown, so the shade holds only the newest. */
export async function clearShownChimes(): Promise<void> {
  if (supported) await Notifications.dismissAllNotificationsAsync();
}
