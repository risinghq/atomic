import type { Budget, Category, Kind, Settings, Store, Transaction } from '@atomic/core';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/** Everything the screens read, loaded from the store in one go. */
export type Snapshot = {
  /** Archived ones included, so old transactions keep their category. */
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
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

async function load(store: Store): Promise<Snapshot> {
  const [categories, transactions, budgets, settings] = await Promise.all([
    store.categories({ archived: true }),
    store.transactions(),
    store.budgets(),
    store.settings(),
  ]);

  return { categories, transactions, budgets, settings };
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
      if (current) setSnapshot(loaded);
    });

    return () => {
      current = false;
    };
  }, [store]);

  const reload = useCallback(async () => {
    setSnapshot(await load(store));
  }, [store]);

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
