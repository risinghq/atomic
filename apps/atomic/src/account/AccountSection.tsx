import { ListRow, ListSection, Sheet, useToast } from '@atomic/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSheet } from '../useSheet';
import type { Provider } from './api';
import { useAccount, type SyncStatus } from './AccountProvider';
import { SignInFailed } from './signIn';

const statusLabel: Record<SyncStatus, string> = {
  idle: 'Sincronizado',
  syncing: 'Sincronizando…',
  offline: 'Sin conexión. Se sincroniza al volver.',
};

/** The message for a sign-in that did not finish. */
export function signInError(error: unknown): string {
  if (error instanceof SignInFailed && error.reason === 'expired')
    return 'El inicio de sesión tardó demasiado. Inténtalo otra vez.';

  if (error instanceof SignInFailed && error.reason === 'unavailable')
    return 'Este inicio de sesión aún no está disponible.';

  return 'No se pudo iniciar sesión. Revisa tu conexión.';
}

/** Ajustes' account rows: sign in, or the signed-in email, sign out and account deletion. */
export function AccountSection() {
  const insets = useSafeAreaInsets();
  const account = useAccount();
  const toast = useToast();
  const confirmDelete = useSheet();

  if (!account.supported) return null;

  async function signIn(provider: Provider) {
    try {
      if ((await account.signIn(provider)) !== 'cancelled') toast({ text: 'Sesión iniciada' });
    } catch (error) {
      toast({ text: signInError(error), tone: 'error' });
    }
  }

  async function deleteAccount() {
    confirmDelete.hide();

    try {
      await account.deleteAccount();
      toast({ text: 'Cuenta eliminada' });
    } catch {
      toast({ text: 'No se pudo eliminar la cuenta. Revisa tu conexión.', tone: 'error' });
    }
  }

  if (!account.email) {
    return (
      <ListSection
        title="Cuenta"
        footer="Guarda una copia en la nube y usa tus datos en otro dispositivo.">
        <ListRow title="Continuar con Google" onPress={() => void signIn('google')} />
        <ListRow title="Continuar con GitHub" onPress={() => void signIn('github')} />
      </ListSection>
    );
  }

  return (
    <>
      <ListSection title="Cuenta">
        <ListRow title={account.email} subtitle={statusLabel[account.status]} />
        <ListRow title="Cerrar sesión" onPress={() => void account.signOut()} />
        <ListRow title="Eliminar cuenta" destructive onPress={() => confirmDelete.show()} />
      </ListSection>

      <Sheet
        visible={confirmDelete.open}
        onClose={confirmDelete.hide}
        title="¿Eliminar tu cuenta?"
        bottomInset={insets.bottom}>
        <ListSection footer="Se borran tus datos de la nube y se cierra la sesión en todos tus dispositivos. Los datos de este dispositivo se quedan.">
          <ListRow title="Eliminar cuenta" destructive onPress={() => void deleteAccount()} />
        </ListSection>
      </Sheet>
    </>
  );
}
