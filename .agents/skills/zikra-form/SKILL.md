---
name: zikra-form
description: Use when adding or extending a form on a Zikra site (contact, quote request, newsletter, etc.) — covers the shadcn react-hook-form island, the shared zod schema in src/lib/schema.ts, the Astro Action pipeline in src/actions/index.ts (Turnstile → R2 → Plunk → optional Z360), reading secrets from context.locals.runtime.env, and the "R2 before Z360, never lose a lead" rule.
---

# Build a form wired to the Zikra lead pipeline

A Zikra form has three layers, all sharing one zod schema:

1. **Island** — `src/components/ContactForm.tsx` (shadcn `form` + react-hook-form + `zodResolver`), hydrated on a page with `client:visible`.
2. **Schema** — `src/lib/schema.ts` (`leadSchema`), imported by both the island and the server so client and server validate identically. It must **not** import from `astro:*` (keeps it Vitest-testable).
3. **Action** — `src/actions/index.ts`, the Astro Action that runs the pipeline server-side on the Worker. The current React island calls it as JSON through the `astro:actions` client.

## 1. Reuse / adapt the island

Start from `src/components/ContactForm.tsx`. It already renders the shadcn form fields, mounts the Turnstile widget (site key from `TURNSTILE_SITE_KEY` in `@/config`), calls `actions.submitLead(values)` via the `astro:actions` client, and shows success/error toasts with `sonner`.

To add a field:
1. Add it to `leadSchema` (step 2).
2. Add a matching `<FormField ... />` block using the shadcn `form`, `input`/`textarea`/`select` components from `@/components/ui/*`. Tie every control to a `<FormLabel>` (accessibility is non-negotiable).
3. The action receives the new field automatically once it's in the schema and present in the React Hook Form defaults.

Keep the island small — it's the only JS that ships for the form. Use `useState` for local UI state; only reach for nanostores if state must cross islands.

## 2. Extend the shared zod schema

Edit `src/lib/schema.ts`. Current shape:

```ts
export const leadSchema = z.object({
  name: z.string().min(2, "Please enter your name.").max(100),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().optional(),
  message: z.string().min(10, "…").max(5000),
  turnstileToken: z.string().min(1, "Please complete the spam check."),
});
export type LeadInput = z.infer<typeof leadSchema>;
```

Add fields here with human-readable error messages. Keep it framework-free — **no `astro:*` imports**. `turnstileToken` must stay: the client sets it from the widget callback and the server verifies it.

## 3. The Astro Action — pipeline order matters

The action lives in `src/actions/index.ts` and validates its `input` with `leadSchema`. It uses the default JSON action mode because the hydrated React form calls `actions.submitLead(values)`. It reads the Worker env from **`context.locals.runtime.env`** (typed through generated Wrangler types plus the global `Env` bridge in `src/env.d.ts`).

**Never** read secrets from `import.meta.env` or `process.env`, and never hardcode them. The available env:

- `LEADS_BUCKET: R2Bucket`
- `TURNSTILE_SECRET: string`
- `PLUNK_API_KEY: string`
- `Z360_TOKEN?: string`

Run the steps in **exactly this order**:

```ts
import { defineAction, ActionError } from "astro:actions";
import { leadSchema } from "@/lib/schema";
import { verifyTurnstile } from "@/lib/turnstile";
import { SITE } from "@/config";

export const server = {
  submitLead: defineAction({
    input: leadSchema,
    handler: async (input, context) => {
      const env = context.locals.runtime.env;

      // 1. Turnstile — reject spam before doing any work.
      const ip = context.request.headers.get("CF-Connecting-IP") ?? undefined;
      const ok = await verifyTurnstile(input.turnstileToken, env.TURNSTILE_SECRET, ip);
      if (!ok) {
        throw new ActionError({ code: "FORBIDDEN", message: "Spam check failed." });
      }

      // 2. R2 FIRST — durably back up the lead before anything that can fail.
      const id = crypto.randomUUID();
      await env.LEADS_BUCKET.put(
        `leads/${new Date().toISOString().slice(0, 10)}/${id}.json`,
        JSON.stringify({ id, receivedAt: new Date().toISOString(), ...input }),
        { httpMetadata: { contentType: "application/json" } },
      );

      // 3. Plunk — notify SITE.adminEmail (+ optional autoresponder).
      //    A Plunk failure must NOT lose the lead — it's already in R2.
      if (env.PLUNK_API_KEY) {
        // POST to Plunk using env.PLUNK_API_KEY; send to SITE.adminEmail,
        // from SITE.emailFromName. Log/swallow failures — do not rethrow.
      }

      // 4. Z360 — optional CRM push, LAST and only when enabled + token present.
      if (SITE.z360Enabled && env.Z360_TOKEN) {
        // POST to SITE.z360InquiriesUrl with env.Z360_TOKEN. Best-effort; the
        // lead is already safe in R2, so a Z360 error must not fail the submit.
      }

      return { ok: true };
    },
  }),
};
```

### The "R2 before Z360, never lose a lead" rule

R2 is the durable source of truth. **Write to R2 before the email and CRM steps**, because those call external services that can be slow, rate-limited, or down. Once the lead is in R2 it can never be lost — email and Z360 are best-effort side effects. If email or Z360 throws, log it and continue; **do not** rethrow in a way that fails the submission after R2 succeeded. Only Turnstile failure (step 1, before R2) rejects the request.

If you intentionally add a no-JS HTML form fallback later, revisit this skill and the action together. Astro form actions should use `accept: "form"` and submit `FormData`; the current hydrated island path is JSON by design.

## 4. Per-site settings

These live in `src/config.ts` (`SITE`), not in the action:

- `SITE.adminEmail` — where Plunk sends the notification.
- `SITE.emailFromName` — sender name on notification/autoresponder emails.
- `SITE.z360Enabled` — master switch for the CRM push. Both this **and** the `Z360_TOKEN` secret must be present for step 4 to run.
- `SITE.z360InquiriesUrl` — the Z360 endpoint.

Secrets for local dev go in `.dev.vars` (copy `.dev.vars.example`); in production they're Worker Secrets (`wrangler secret put …` — see the `zikra-deploy` skill).

## 5. Test & verify

```bash
pnpm test       # unit-test leadSchema and buildTurnstileBody (pure, no astro:*)
pnpm check
pnpm typecheck
pnpm preview     # astro build && wrangler dev — exercises the real Worker + bindings
```

With the default test Turnstile keys the widget always passes locally. Submit the form under `pnpm preview` and confirm a JSON object lands in the R2 bucket.
