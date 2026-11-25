const RESEND_EMAILS = 'https://api.resend.com/emails';

/** The sender. Resend must have `atomic.rising.sh` verified for it. */
export const MAIL_FROM = 'Atomic <acceso@atomic.rising.sh>';

/** Whether the Worker can send mail; a deploy without the Resend key cannot. */
export const mailConfigured = (env: Pick<Env, 'RESEND_API_KEY'>) => Boolean(env.RESEND_API_KEY);

/** The provider refused the message or could not be reached. */
export class MailFailed extends Error {}

/** Emails a sign-in code. */
export async function sendSignInCode(
  env: Pick<Env, 'RESEND_API_KEY'>,
  to: string,
  code: string
): Promise<void> {
  const response = await fetch(RESEND_EMAILS, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: MAIL_FROM,
      to: [to],
      subject: `${code} es tu código de Atomic`,
      text: [
        `Tu código para entrar a Atomic es ${code}.`,
        '',
        'Vence en 10 minutos. Si no lo pediste, ignora este correo.',
      ].join('\n'),
    }),
  }).catch(() => undefined);

  if (!response?.ok) throw new MailFailed(`Resend answered ${response?.status ?? 'nothing'}`);
}
