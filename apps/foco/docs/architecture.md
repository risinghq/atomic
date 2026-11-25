# Architecture

foco is one state-driven shell over `@rising/ui` and `@rising/core`. It keeps
its own small store: the chime settings and a log of start, switch and stop
events. The chimes themselves are local notifications the system holds, so they
arrive with the app closed.

```text
index.ts ─► App ─► FocoProvider ─► Shell ─┬─► NowScreen
                     │      │              ├─► TodayScreen
                     │      │              └─► FocusForm (sheet)
                     │      └─ chimes.ts ─┬─► expo-notifications
                     │                    └─► modules/voice (Android)
                     └─ store.ts (expo-sqlite)
```

## Code map

| Path                                                        | Owns                                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [`src/App.tsx`](../src/App.tsx)                             | Opens the store and registers the notification channels, then mounts the provider.   |
| [`src/data/store.ts`](../src/data/store.ts)                 | The schema, the settings and the event log in `foco.db`.                             |
| [`src/data/FocoProvider.tsx`](../src/data/FocoProvider.tsx) | The settings and the actions that change them, through `useFoco()`.                  |
| [`src/plan.ts`](../src/plan.ts)                             | When chimes fall (interval, jitter, schedule) and what each one says.                |
| [`src/chimes.ts`](../src/chimes.ts)                         | Asks for permission and hands the next window of chimes to the system.               |
| [`modules/voice`](../modules/voice)                         | Speaks each chime on Android, from its own alarms.                                   |
| [`src/timeline.ts`](../src/timeline.ts)                     | Turns the event log into the stretches Hoy lists.                                    |
| [`src/Shell.tsx`](../src/Shell.tsx)                         | The tab bar, the active tab and the task sheet. Android back returns to Ahora first. |
| [`src/useSwitchRequest.ts`](../src/useSwitchRequest.ts)     | Opens the task sheet when the person answers a chime with Cambié.                    |
| [`src/screens/`](../src/screens)                            | Ahora (the running task and the chime settings) and Hoy.                             |
| [`src/FocusForm.tsx`](../src/FocusForm.tsx)                 | The task sheet: what the person is doing and the time they give it.                  |

## Chimes

The provider replaces every pending chime whenever the settings change and
whenever the app comes to the foreground. It schedules a window of them: 60 on
iOS, which keeps at most 64 pending notifications, and 144 on Android. The last
chime in a full window asks the person to open the app, which schedules the next
window.

Each chime is a date trigger on one of two Android channels: `chime`, or `over`
once the task has run past its time. On Android 14 and later, `allowChimes` asks
for exact alarms so a chime lands on its minute.

## Voice

With Voz on, each chime is also spoken. A notification runs no JavaScript when
it fires with the app closed, so the speech is native: the Android-only module
in [`modules/voice`](../modules/voice) arms one exact alarm per chime, 1.5
seconds after it, with the text `chimeFor` returns as `spoken`.
[`VoiceReceiver`](../modules/voice/android/src/main/java/com/empiricalhq/foco/voice/VoiceReceiver.kt)
speaks it with the system's Spanish text-to-speech over the notification stream.
It asks to duck other audio; Android 15 and later refuse that to an app in the
background, so the voice plays over music there. It stays quiet in silent or
vibrate mode and during a call.
[`Alarms`](../modules/voice/android/src/main/java/com/empiricalhq/foco/voice/Alarms.kt)
keeps the pending texts in preferences and arms them again after a reboot.

iOS and the web have no voice module, so Ahora hides the Voz toggle there.

The web build shows the screens and stores its data, but sends no chimes.
