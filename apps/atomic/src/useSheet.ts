import { useCallback, useState } from 'react';

export type SheetState<T> = {
  open: boolean;
  /** What the sheet is about. It outlives `open`, so the content stays while the sheet slides away. */
  value: T | undefined;
  /** Changes on every `show`. Key the sheet's form on it to start the form fresh. */
  session: number;
  show: (value?: T) => void;
  hide: () => void;
};

/** The open state of a `Sheet` and the record it shows. */
export function useSheet<T = undefined>(): SheetState<T> {
  const [state, setState] = useState({
    open: false,
    value: undefined as T | undefined,
    session: 0,
  });

  const show = useCallback((value?: T) => {
    setState((current) => ({ open: true, value, session: current.session + 1 }));
  }, []);

  const hide = useCallback(() => {
    setState((current) => ({ ...current, open: false }));
  }, []);

  return { ...state, show, hide };
}
