import { setHapticsEnabled } from '@atomic/ui';
import { useEffect } from 'react';
import { useData } from './data/DataProvider';
import { Onboarding } from './screens/Onboarding';
import { Shell } from './Shell';

/** The setup screen until the user finishes it, then the app. */
export function Root() {
  const { settings } = useData();

  useEffect(() => {
    setHapticsEnabled(settings.haptics);
  }, [settings.haptics]);

  return settings.onboarded ? <Shell /> : <Onboarding />;
}
