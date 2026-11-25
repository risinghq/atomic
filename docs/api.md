# API

`apps/api` is the Cloudflare Worker behind `https://atomic.rising.sh`. It signs
a person in with Google, GitHub or a code sent to their email, and keeps a copy
of their records in D1, so their devices share one set of data. It speaks JSON
and has no web pages.

```bash
cd apps/api
bun run dev       # wrangler dev, with a local D1
bun run test      # Vitest in workerd, against a real local D1
```

## Signing in

The app proves it started a sign-in with PKCE
([RFC 8252](https://www.rfc-editor.org/rfc/rfc8252)): it keeps a random verifier
and sends only its SHA-256.

1. The app opens `GET /auth/{google|github}/start?challenge=<S256 of verifier>`
   in a browser session. The Worker stores the sign-in for ten minutes and
   redirects to the provider. When that provider's client id secret is unset, it
   redirects to `atomic://auth?error=unavailable` instead.
2. The provider returns to `/auth/{provider}/callback`. The Worker trades the
   provider's code for the person's verified email, finds or creates the account
   for that email, and redirects to `atomic://auth?code=<one-time code>`. On
   failure it redirects to `atomic://auth?error=expired|denied|failed`.
3. The app sends `POST /auth/token {code, verifier}` and receives
   `{token, email}`. The code works once.

Every other route needs `Authorization: Bearer <token>`. The Worker stores only
the SHA-256 of a token. An account is keyed by email, so Google and GitHub with
the same verified address open the same account. From GitHub the Worker takes
the primary address, and only when GitHub has verified it.

[`auth.ts`](../apps/api/src/auth.ts) holds the routes and
[`providers.ts`](../apps/api/src/providers.ts) the Google and GitHub calls.

### With an emailed code

1. The app sends `POST /auth/email/start {email}`. The Worker emails a six-digit
   code through Resend and answers 204. The new code replaces the last one sent
   to that address.
2. The person types the code, and the app sends
   `POST /auth/email/verify {email, code}`. The Worker answers `{token, email}`,
   as `/auth/token` does, and the account is the one for that address.

A code lasts ten minutes, works once, and allows five guesses. The Worker sends
an address one code a minute and five an hour. Errors come back as `{error}`:

| Status | `error`          | When                                               |
| ------ | ---------------- | -------------------------------------------------- |
| 400    | `invalid email`  | The address is not one.                            |
| 400    | `invalid code`   | The code is wrong; a guess is spent.               |
| 400    | `expired`        | No live code: expired, used, or out of guesses.    |
| 429    | `too soon`       | A code went to the address less than a minute ago. |
| 429    | `too many codes` | Five codes went to the address this hour.          |
| 502    | `mail failed`    | Resend refused the message. No code is stored.     |
| 503    | `unavailable`    | The Worker has no `RESEND_API_KEY`.                |

[`email.ts`](../apps/api/src/email.ts) holds the routes and
[`mail.ts`](../apps/api/src/mail.ts) the call to Resend.

## Routes

| Route             | Does                                                       |
| ----------------- | ---------------------------------------------------------- |
| `GET /me`         | Returns `{email}`.                                         |
| `POST /sync`      | Sends changes and receives the ones made elsewhere.        |
| `DELETE /data`    | Erases the account's records. The account stays signed in. |
| `DELETE /session` | Signs this device out.                                     |
| `DELETE /account` | Deletes the account, its records and every session.        |

## Sync

`POST /sync` takes the cursor of the device's last sync, or null on the first,
and the store's `pendingChanges()`:

```json
{
  "cursor": "41",
  "changes": {
    "categories": [],
    "transactions": [],
    "budgets": [],
    "recurring": [],
    "settings": []
  }
}
```

It answers with the changes made on other devices since the cursor, and the new
cursor:

```json
{
  "changes": {
    "categories": [],
    "transactions": [],
    "budgets": [],
    "recurring": [],
    "settings": []
  },
  "cursor": "57",
  "more": false
}
```

The app passes the reply to `completeSync` (see [Core](core.md#sync)). When
`more` is true the reply holds the first 2,000 records, and the app syncs again
for the rest.

The Worker stores each record as the app sent it and reads only its id (a
setting's `key`) and `updatedAt`. It keeps the copy with the newer `updatedAt`.
Every write takes the next number of the account's counter, and the cursor is
the last number a device has received. One sync runs as one D1 batch, which is a
transaction ([`sync.ts`](../apps/api/src/sync.ts)).

A request carries at most 4 MB, a record at most 64 KB, and only the settings in
`syncedSettings`. Anything else is refused with 400 or 413.

## Database

[`migrations/`](../apps/api/migrations) holds the D1 schema. Add a change as a
new numbered file; never edit one that has run. Apply them locally with
`bun run db:migrate:local`.

## Deploy

A push to `master` that touches `apps/api`, `packages/core` or `bun.lock` runs
[`deploy-api.yml`](../.github/workflows/deploy-api.yml): typecheck, tests, the
remote migrations, then `wrangler deploy`. It reads the repository secret
`CLOUDFLARE_API_TOKEN` and the variable `CLOUDFLARE_ACCOUNT_ID`.

The OAuth clients are set once as Worker secrets:

```bash
cd apps/api
for name in GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET GITHUB_CLIENT_ID GITHUB_CLIENT_SECRET; do
  bunx wrangler secret put "$name"
done
```

Each provider's client lists the callback
`https://atomic.rising.sh/auth/<provider>/callback`.

Email codes go out from `atomic@rising.sh`. Resend must have `rising.sh`
verified, with the DNS records it lists in the `rising.sh` Cloudflare zone. Set
the API key:

```bash
cd apps/api
bunx wrangler secret put RESEND_API_KEY
```
