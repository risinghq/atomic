import { setHapticsEnabled } from '@atomic/ui';
import { useEffect } from 'react';
import { useData } from './data/DataProvider';
import { AppLock } from './lock/AppLock';
import { Onboarding } from './screens/Onboarding';
import { Shell } from './Shell';

/** The setup screen until the user finishes it, then the app behind its lock. */
export function Root() {
  const { settings } = useData();

  useEffect(() => {
    setHapticsEnabled(settings.haptics);
  }, [settings.haptics]);

  if (!settings.onboarded) return <Onboarding />;

  return (
    <AppLock>
      <Shell />
    </AppLock>
  );
}
