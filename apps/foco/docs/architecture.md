# Architecture

foco is one state-driven shell over `@rising/ui` and `@rising/core`. It keeps
its own small store: the chime settings and a log of start, switch and stop
events. The chimes themselves are local notifications the system holds, so they
arrive with the app closed.

```text
index.ts ─► App ─► FocoProvider ─► Shell ─┬─► NowScreen
                     │      │              ├─► TodayScreen
                     │      │              └─► FocusForm (sheet)
                     │      └─ chimes.ts ─► expo-notifications
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

The web build shows the screens and stores its data, but sends no chimes.
