import { useData } from './data/DataProvider';
import { Onboarding } from './screens/Onboarding';
import { Shell } from './Shell';

/** The setup screen until the user finishes it, then the app. */
export function Root() {
  const { settings } = useData();

  return settings.onboarded ? <Shell /> : <Onboarding />;
}
