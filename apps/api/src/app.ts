import type { Context } from 'hono';

/** The signed-in person a Bearer token belongs to. */
export type Account = { userId: string; email: string; tokenHash: string };

export type App = { Bindings: Env; Variables: { account: Account } };

export type AppContext = Context<App>;
