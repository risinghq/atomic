import { useEffect } from 'react';
import { Linking } from 'react-native';

/** The link that opens the app on a new entry, as the widget's add button does. */
export const NEW_ENTRY_URL = 'atomic://new';

/** Calls `open` when the app starts from the new-entry link or receives it while running. */
export function useEntryLink(open: () => void): void {
  useEffect(() => {
    let current = true;

    void Linking.getInitialURL().then((url) => {
      if (current && url === NEW_ENTRY_URL) open();
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (url === NEW_ENTRY_URL) open();
    });

    return () => {
      current = false;
      subscription.remove();
    };
  }, [open]);
}
