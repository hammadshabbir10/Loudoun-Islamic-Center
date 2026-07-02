/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

/**
 * The Cloudflare Worker runtime environment.
 *
 * Bindings (R2, etc.) come from wrangler.jsonc; secrets come from Worker
 * Secrets in production and .dev.vars in local dev. Access it in server code
 * (Actions, endpoints, middleware) via `context.locals.runtime.env`.
 */
interface Env {
  /** R2 bucket for the "never lose a lead" JSON backup. Bound in wrangler.jsonc. */
  LEADS_BUCKET: R2Bucket;

  /** Cloudflare Turnstile secret key. Worker Secret / .dev.vars. */
  TURNSTILE_SECRET: string;
  /** Plunk transactional email API key. Worker Secret / .dev.vars. */
  PLUNK_API_KEY: string;
  /** Optional Z360 CRM token. When present (and enabled), leads are pushed to Z360. */
  Z360_TOKEN?: string;
}

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
