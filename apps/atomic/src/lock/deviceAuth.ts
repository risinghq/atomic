import { authenticateAsync, getEnrolledLevelAsync, SecurityLevel } from 'expo-local-authentication';

/** Whether the device has a screen lock (a PIN, pattern, password or biometric) to ask for. */
export async function canLock(): Promise<boolean> {
  return (await getEnrolledLevelAsync()) !== SecurityLevel.NONE;
}

/**
 * Asks for the device's screen lock: a biometric, falling back to the PIN. Resolves
 * true only when the person passed it.
 */
export async function unlock(): Promise<boolean> {
  const result = await authenticateAsync({
    promptMessage: 'Desbloquear Atomic',
    cancelLabel: 'Cancelar',
  });

  return result.success;
}
