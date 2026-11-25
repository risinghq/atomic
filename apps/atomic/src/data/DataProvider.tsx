import {
  nextOccurrence,
  type Budget,
  type Category,
  type Kind,
  type Recurring,
  type Settings,
  type Store,
  type Transaction,
} from '@atomic/core';
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

/** Everything the screens read, loaded from the store in one go. */
export type Snapshot = {
  /** Archived ones included, so old transactions keep their category. */
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  recurring: Recurring[];
  settings: Settings;
};

export type Data = Snapshot & {
  /** Runs writes against the store, then reloads the snapshot. */
  write: (change: (store: Store) => Promise<unknown>) => Promise<void>;

  /** Reloads the snapshot after the store changed outside `write`, as a sync does. */
  reload: () => Promise<void>;

  /** How many times `write` has run. Sync sends new changes when it grows. */
  writes: number;
};

const DataContext = createContext<Data | null>(null);

/** setTimeout fires at once past a signed 32-bit delay, about 24 days. */
const MAX_DELAY = 2 ** 31 - 1;

/** Records the recurring transactions that came due, then reads the snapshot. */
async function load(store: Store): Promise<{ snapshot: Snapshot; recorded: number }> {
  const recorded = await store.applyRecurring();

  const [categories, transactions, budgets, recurring, settings] = await Promise.all([
    store.categories({ archived: true }),
    store.transactions(),
    store.budgets(),
    store.recurring(),
    store.settings(),
  ]);

  return { snapshot: { categories, transactions, budgets, recurring, settings }, recorded };
}

/**
 * Holds the store and the snapshot every screen reads. A write goes through
 * `write`, so the screens never hold a copy of the data that the store does
 * not have.
 */
export function DataProvider({ store, children }: { store: Store; children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [writes, setWrites] = useState(0);

  useEffect(() => {
    let current = true;

    void load(store).then((loaded) => {
      if (!current) return;

      setSnapshot(loaded.snapshot);
      if (loaded.recorded > 0) setWrites((count) => count + 1);
    });

    return () => {
      current = false;
    };
  }, [store]);

  // Occurrences the store records on its own count as writes, so sync sends them.
  const reload = useCallback(async () => {
    const loaded = await load(store);

    setSnapshot(loaded.snapshot);
    if (loaded.recorded > 0) setWrites((count) => count + 1);
  }, [store]);

  const recurring = snapshot?.recurring;

  // While the app is open, reload when the next occurrence comes due.
  useEffect(() => {
    if (!recurring || recurring.length === 0) return;

    const due = Math.min(...recurring.map((rule) => nextOccurrence(rule, Date.now())));
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      clearTimeout(timer);

      const wait = due - Date.now();

      if (wait <= 0) void reload();
      else timer = setTimeout(schedule, Math.min(wait, MAX_DELAY));
    };

    if (AppState.currentState === 'active' || AppState.currentState == null) schedule();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') schedule();
      else clearTimeout(timer);
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [recurring, reload]);

  const write = useCallback<Data['write']>(
    async (change) => {
      await change(store);
      await reload();
      setWrites((count) => count + 1);
    },
    [store, reload]
  );

  const data = useMemo(
    () => (snapshot ? { ...snapshot, write, reload, writes } : null),
    [snapshot, write, reload, writes]
  );

  if (!data) return null;

  return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
}

export function useData(): Data {
  const data = useContext(DataContext);
  if (!data) throw new Error('useData must be called inside a DataProvider');
  return data;
}

/** The categories a picker offers for one kind. */
export function pickable(categories: readonly Category[], kind: Kind): Category[] {
  return categories.filter((category) => category.kind === kind && !category.archived);
}

/** The category with the id. The schema's foreign key guarantees it exists. */
export function categoryOf(categories: readonly Category[], id: string): Category {
  const category = categories.find((candidate) => candidate.id === id);
  if (!category) throw new Error(`Unknown category ${id}`);
  return category;
}
