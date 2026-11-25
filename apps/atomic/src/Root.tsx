import { setHapticLevel } from '@rising/ui';
import { useEffect } from 'react';
import { useData } from './data/DataProvider';
import { AppLock } from './lock/AppLock';
import { Onboarding } from './screens/Onboarding';
import { Shell } from './Shell';
import { refreshWidget } from './widget/platform';

/** The setup screen until the user finishes it, then the app behind its lock. */
export function Root() {
  const { settings, transactions, budgets } = useData();

  useEffect(() => {
    setHapticLevel(settings.haptics);
  }, [settings.haptics]);

  useEffect(() => {
    refreshWidget({ settings, transactions, budgets });
  }, [settings, transactions, budgets]);

  if (!settings.onboarded) return <Onboarding />;

  return (
    <AppLock>
      <Shell />
    </AppLock>
  );
}
