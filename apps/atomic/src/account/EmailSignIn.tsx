import { Button, radii, Sheet, space, Text, textStyle, useTheme } from '@atomic/ui';
import { useRef, useState, type ComponentRef, type RefObject } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SheetState } from '../useSheet';
import { useAccount, type SignInResult } from './AccountProvider';
import { ApiFailed } from './api';

const CODE_LENGTH = 6;

const reasons: Record<string, string> = {
  'invalid email': 'Escribe un correo válido.',
  'invalid code': 'El código no es correcto.',
  expired: 'El código venció. Pide uno nuevo.',
  'too soon': 'Espera un minuto antes de pedir otro código.',
  'too many codes': 'Pediste muchos códigos. Inténtalo en una hora.',
  'mail failed': 'No se pudo enviar el correo. Inténtalo otra vez.',
  unavailable: 'Este inicio de sesión aún no está disponible.',
};

/** The message for a code that was not sent or not accepted. */
function codeError(error: unknown): string {
  const reason = error instanceof ApiFailed ? error.reason : undefined;

  return (reason && reasons[reason]) ?? 'No se pudo iniciar sesión. Revisa tu conexión.';
}

type Props = { sheet: SheetState<undefined>; onSignedIn: (result: SignInResult) => void };

/** A sheet that signs in with a code emailed to the address the person types. */
export function EmailSignIn({ sheet, onSignedIn }: Props) {
  const insets = useSafeAreaInsets();
  const emailField = useRef<Field>(null);

  return (
    <Sheet
      visible={sheet.open}
      onClose={sheet.hide}
      onShown={() => emailField.current?.focus()}
      title="Continuar con correo"
      bottomInset={insets.bottom}>
      <CodeForm key={sheet.session} emailField={emailField} onSignedIn={onSignedIn} />
    </Sheet>
  );
}

type Field = ComponentRef<typeof TextInput>;

type FormProps = {
  emailField: RefObject<Field | null>;
  onSignedIn: (result: SignInResult) => void;
};

function CodeForm({ emailField, onSignedIn }: FormProps) {
  const { colors } = useTheme();
  const account = useAccount();

  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function attempt(task: () => Promise<void>) {
    setBusy(true);
    setError(null);

    try {
      await task();
    } catch (failure) {
      setError(codeError(failure));
    } finally {
      setBusy(false);
    }
  }

  function send(address: string) {
    void attempt(async () => {
      await account.sendCode(address);
      setSentTo(address);
      setCode('');
    });
  }

  function enter(address: string) {
    void attempt(async () => onSignedIn(await account.signInWithCode(address, code)));
  }

  const input = [
    styles.input,
    textStyle('body'),
    { backgroundColor: colors.surface, color: colors.text },
  ];

  const message = error ? (
    <Text variant="footnote" color="danger">
      {error}
    </Text>
  ) : null;

  if (!sentTo) {
    const address = email.trim();

    return (
      <View style={styles.form}>
        <TextInput
          ref={emailField}
          accessibilityLabel="Correo"
          value={email}
          onChangeText={setEmail}
          placeholder="tu@correo.com"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={() => address && send(address)}
          style={input}
        />
        {message}
        <Button label="Enviar código" onPress={() => send(address)} disabled={busy || !address} />
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <Text variant="body" color="textMuted">
        {`Te enviamos un código de ${CODE_LENGTH} dígitos a ${sentTo}.`}
      </Text>
      <TextInput
        accessibilityLabel="Código"
        autoFocus
        value={code}
        onChangeText={(typed) => setCode(typed.replace(/\D/g, '').slice(0, CODE_LENGTH))}
        placeholder="000000"
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={CODE_LENGTH}
        style={[input, styles.code]}
      />
      {message}
      <Button
        label="Entrar"
        onPress={() => enter(sentTo)}
        disabled={busy || code.length !== CODE_LENGTH}
      />
      <Button
        label="Enviar otro código"
        variant="secondary"
        onPress={() => send(sentTo)}
        disabled={busy}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.md },
  input: { borderRadius: radii.lg, paddingHorizontal: space.lg, paddingVertical: space.md },
  code: { letterSpacing: 8, textAlign: 'center' },
});
