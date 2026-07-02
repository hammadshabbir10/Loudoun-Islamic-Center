# Contributing

This covers building **on** the template — both in a forked site and in the template itself.
Read [`AGENTS.md`](./AGENTS.md) first; it's the source of truth for architecture and
conventions. This file is about _how you work_.

---

## Branching

- Never commit to `main` directly. Open a PR.
- Branch names: `type/short-description`, where `type` is one of
  `feat` · `fix` · `chore` · `docs` · `refactor` · `test`.
  Examples: `feat/pricing-page`, `fix/contact-form-validation`, `docs/deploy-steps`.
- Keep PRs small and focused on one change.

---

## Use the skills

Reach for the matching skill instead of improvising — they encode the conventions below.

| Task                              | Skill             |
| --------------------------------- | ----------------- |
| New static page                   | `zikra-page`      |
| New MDX blog post                 | `zikra-blog-post` |
| Add / change a form               | `zikra-form`      |
| Pre-launch SEO review             | `zikra-seo-audit` |
| Deploy a site to Cloudflare       | `zikra-deploy`    |
| Coordinated dependency bump       | `zikra-update`    |

---

## Coding conventions

- **TypeScript strict.** No `any` escape hatches (the only relaxation is the vendored
  `src/components/ui/*` primitives). Type Worker bindings/secrets via the global `Env`
  interface and `context.locals.runtime.env`.
- **Path alias:** import with `@/…` (→ `src/…`), not long relative paths.
- **Static by default, zero JS.** Pages are prerendered and ship no client JS. Add
  interactivity only where needed, as a small React island with an explicit `client:*`
  directive. To make a link _look_ like a button, use `buttonVariants` from
  `@/components/ui/button` on an `<a>` — don't ship an island for that.
- **shadcn/ui for interactive islands only.** Use the primitives in `@/components/ui/*`;
  merge classes with `cn` from `@/lib/utils`.
- **Layout:** wrap page content in `BaseLayout` and set its SEO props. Never add your own
  `<html>`/`<head>`/`<body>` or duplicate SEO tags — `BaseLayout` owns them.
- **State:** Nanostores across islands, React `useState` within an island. Not Redux.
- **Validation:** zod (`src/lib/schema.ts`), shared by the client form and the server Action.
- **Accessibility:** labels tied to inputs, `alt` on every image, one `<h1>` per page with
  correct heading order, visible focus states. `jsx-a11y` + Astro a11y rules run in ESLint.
- **Do not edit the locked files** (`astro.config.mjs`, `package.json`, `pnpm-lock.yaml`,
  `tsconfig.json`, `wrangler.jsonc`, ESLint/Prettier/Vitest configs, `src/config.ts` except
  for real per-site values, `src/env.d.ts`, `src/styles/globals.css`, `src/lib/utils.ts`,
  `src/components/ui/*`, the shared `Seo`/`Header`/`Footer`/`BaseLayout`). Do not upgrade
  dependencies — see the Astro-5-pinned note in `AGENTS.md`.

---

## Secrets — never commit them

- `TURNSTILE_SECRET`, `PLUNK_API_KEY`, `Z360_TOKEN` live **only** in Cloudflare Worker Secrets
  (prod) and the **gitignored `.dev.vars`** (local). Read them at runtime via
  `context.locals.runtime.env` — **never** `import.meta.env`, `process.env`, or hardcoded.
- Non-secret, build-time config (including the **public** Turnstile _site_ key) goes in
  `src/config.ts`.
- If you ever commit a secret, treat it as compromised: rotate it immediately.

---

## Before every PR

Run the full gate locally and make sure it passes:

```bash
pnpm check && pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

CI runs the same steps (`lint → check → typecheck → test → build`) on every PR and push to
`main`. **CI must be green to merge.** No Playwright/e2e — QA is a human role.

---

## Working with shadcn/ui components

- **Update an existing primitive:** re-run the generator and re-review the diff.

  ```bash
  pnpm dlx shadcn@latest add button --overwrite
  ```

  Keep vendored components close to upstream; site-specific styling belongs in the consumer,
  not the primitive.

- **Add a new primitive** the project doesn't ship yet:

  ```bash
  pnpm dlx shadcn@latest add tooltip
  ```

  It lands in `@/components/ui/*` using the repo's `components.json` settings (new-york style,
  neutral base color, `@/` aliases, lucide icons).

- **Add a new _shared_ UI component** (a Zikra-specific composition, not a shadcn primitive):
  put it in `@/components/` (not `ui/`), build it from existing primitives + `cn`, keep it
  server-renderable where possible, and make it an island only if it needs interactivity.
  Document non-obvious props with JSDoc.

The shadcn MCP server (see `.mcp.json`) is available to browse components and blocks.
