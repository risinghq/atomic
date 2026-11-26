import { useFoco } from './data/FocoProvider';
import { Onboarding } from './screens/Onboarding';
import { Shell } from './Shell';

/** The welcome screen until the person passes it, then the tabs. */
export function Root() {
  const { settings } = useFoco();

  return settings.onboarded ? <Shell /> : <Onboarding />;
}
