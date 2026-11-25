declare namespace Cloudflare {
  interface Env {
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
    MIGRATIONS: import('cloudflare:test').D1Migration[];
  }
}
