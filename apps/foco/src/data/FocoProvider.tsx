import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { clearShownChimes, scheduleChimes } from '../chimes';
import type { Plan } from '../plan';
import type { Settings, Store } from './store';

/** The settings that shape the chimes, as opposed to the running session. */
type PlanSettings = Plan & Pick<Settings, 'voice'>;

/** What the person says they will do next, and for how many minutes at most. */
export interface Intent {
  label: string;
  budget: number | null;
}

export interface Foco {
  settings: Settings;
  store: Store;
  start: (intent: Intent) => Promise<void>;
  switchTo: (intent: Intent) => Promise<void>;
  stop: () => Promise<void>;
  changePlan: (change: Partial<PlanSettings>) => Promise<void>;
  /** Saves the plan chosen on the welcome screen and leaves it for good. */
  finishOnboarding: (plan: Partial<PlanSettings>) => Promise<void>;
  /** When the last event was recorded; 0 before any in this run. */
  lastChange: number;
}

const FocoContext = createContext<Foco | null>(null);

/**
 * Holds the settings and the actions that change them. Every change and every
 * return to the app reschedules the chimes, so the pending ones always match
 * the settings.
 */
export function FocoProvider({ store, children }: { store: Store; children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [lastChange, setLastChange] = useState(0);

  useEffect(() => {
    let current = true;

    void store.settings().then((loaded) => {
      if (current) setSettings(loaded);
    });

    return () => {
      current = false;
    };
  }, [store]);

  useEffect(() => {
    if (!settings) return;

    void scheduleChimes(settings, store.now());

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;

      void clearShownChimes();
      void scheduleChimes(settings, store.now());
    });

    return () => subscription.remove();
  }, [settings, store]);

  const begin = useCallback(
    async (kind: 'start' | 'switch', { label, budget }: Intent) => {
      const event = await store.record(kind, label.trim());
      const focus = { label: event.label, budget, since: event.at };

      setSettings(await store.updateSettings({ active: true, focus }));
      setLastChange(event.at);
    },
    [store]
  );

  const stop = useCallback(async () => {
    const event = await store.record('stop');

    setSettings(await store.updateSettings({ active: false, focus: null }));
    setLastChange(event.at);
  }, [store]);

  const changePlan = useCallback(
    async (change: Partial<PlanSettings>) => setSettings(await store.updateSettings(change)),
    [store]
  );

  const finishOnboarding = useCallback(
    async (plan: Partial<PlanSettings>) =>
      setSettings(await store.updateSettings({ ...plan, onboarded: true })),
    [store]
  );

  const value = useMemo(
    () =>
      settings && {
        settings,
        store,
        start: (intent: Intent) => begin('start', intent),
        switchTo: (intent: Intent) => begin('switch', intent),
        stop,
        changePlan,
        finishOnboarding,
        lastChange,
      },
    [settings, store, begin, stop, changePlan, finishOnboarding, lastChange]
  );

  if (!value) return null;

  return <FocoContext.Provider value={value}>{children}</FocoContext.Provider>;
}

export function useFoco(): Foco {
  const foco = useContext(FocoContext);
  if (!foco) throw new Error('useFoco needs a FocoProvider above it.');
  return foco;
}
