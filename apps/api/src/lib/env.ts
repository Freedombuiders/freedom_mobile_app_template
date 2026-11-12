// Bindings declared in wrangler.jsonc (+ secrets from `wrangler secret put` / .dev.vars).
// Add a field here whenever you add a binding, var or secret.
export type Env = {
  DB: D1Database;
  APP_ENV: string;
  // RESEND_API_KEY?: string;
};
