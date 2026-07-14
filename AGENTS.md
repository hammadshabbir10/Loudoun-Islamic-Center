# zikra-astro-starter

The reusable foundation every Zikra agency site is forked from. This is a **GitHub template repo** — you never deploy _this_ repo; you create a new repo from it, edit `src/config.ts`, add content, and ship.

This file is the single source of truth for the whole team **and** the coding agents.
Codex reads `AGENTS.md` natively; Claude Code reads it via `CLAUDE.md` (`@AGENTS.md`).
Humans onboarding a new site should start with `README.md`; contributors read `CONTRIBUTING.md`.

---

## 1. Overview

A production starter for fast, secure marketing sites: static-first Astro rendered to the
Cloudflare edge, with a single on-demand Worker route powering a "never lose a lead" forms
pipeline. Every page is prerendered; interactivity is added surgically with React islands.

### The supported-Astro-baseline note (READ THIS)

**Astro is pinned to the verified Astro 7 major.** All forked sites should share this supported,
security-patched baseline instead of upgrading framework majors independently.

- Do **not** run `astro add`, `pnpm add`, `pnpm up`, or otherwise bump Astro (or any locked
  dependency) inside a site or in this template. Everything you need is already installed.
- Use current **Astro 7** APIs only; do not adopt experimental APIs in the starter.
- A future major bump is a coordinated, template-wide effort. Use the
  **`zikra-update`** skill; do not upgrade ad hoc.

---

## 2. Locked stack

Do not change, upgrade, or add dependencies — the lockfile is authoritative.

| Area       | Choice                                                                               |
| ---------- | ------------------------------------------------------------------------------------ |
| Framework  | **Astro 7** (pinned major), Node **22+**, TypeScript **strict**, **pnpm**            |
| Hosting    | Cloudflare **Workers** via `@astrojs/cloudflare` (`output: "static"`)                |
| Styling    | **Tailwind v4** (`@tailwindcss/vite`)                                                |
| UI islands | `@astrojs/react` + **shadcn/ui** (new-york style), **lucide-react** icons            |
| Content    | `@astrojs/mdx`, `@astrojs/rss`, `@astrojs/sitemap`, `astro:assets`                   |
| SEO        | `astro-seo`, `astro-seo-schema`, `astro-robots-txt`                                  |
| Analytics  | GA4 via `@astrojs/partytown` (off the main thread)                                   |
| State      | **Nanostores** (+ `@nanostores/react`) cross-island; React `useState` in-island      |
| Forms      | `react-hook-form` + `@hookform/resolvers/zod`, **zod** validation, **sonner** toasts |
| Testing    | **Vitest** (unit); ESLint + Prettier (+ `prettier-plugin-astro`)                     |

**Not in the stack** (do not introduce): Redux, Cloudflare KV, Workers AI, Playwright / e2e.
QA is a human role. Redirects are handled by **Cloudflare Bulk Redirects**, not app code.

---

## 3. Directory map

```
AGENTS.md                     ← this file (single source of truth)
CLAUDE.md                     ← one line: @AGENTS.md
README.md                     ← human onboarding + new-site setup
CONTRIBUTING.md               ← how to build on the template
.mcp.json                     ← shared MCP servers for Claude Code-compatible tools
.codex/config.toml            ← Codex MCP bridge to Astro Docs via npx mcp-remote
skills-lock.json              ← external skill provenance + hashes
.agents/
  skills/                     ← Codex/project agent skills mirror
.claude/
  settings.json               ← Claude Code permission allowlist
  skills/
    zikra-page/SKILL.md
    zikra-blog-post/SKILL.md
    zikra-form/SKILL.md
    zikra-seo-audit/SKILL.md
    zikra-deploy/SKILL.md
    zikra-update/SKILL.md
.github/workflows/ci.yml      ← lint → check → typecheck → test → build
.vscode/extensions.json       ← recommended editor extensions
astro.config.mjs              ← locked (do not edit per-site)
wrangler.jsonc                ← Worker config; R2 bucket + assets binding
worker-configuration.d.ts     ← generated Wrangler binding/secret types
.dev.vars.example             ← template for local secrets (copy → .dev.vars)
package.json  eslint.config.js  .prettierrc.json  vitest.config.ts
components.json               ← shadcn config (new-york, neutral, @/ aliases)
tsconfig.json                 ← strict; "@/*" → "./src/*"
scripts/write-assetsignore.mjs ← preserves dist/client/.assetsignore for safe asset uploads
src/
  config.ts                   ← per-site config (SITE, TURNSTILE_SITE_KEY)
  env.d.ts                    ← Astro App.Locals bridge for generated Worker Env
  styles/globals.css          ← Tailwind v4 entry + design tokens
  lib/
    utils.ts                  ← cn() class-merge helper
    schema.ts                 ← zod schemas (lead form)
    lead-pipeline.ts          ← testable Turnstile → R2 → Plunk → Z360 orchestration
    turnstile.ts              ← Turnstile server-side verification
    plunk.ts                  ← Plunk transactional email client
    r2.ts                     ← R2 lead backup helper
    z360.ts                   ← optional Z360 CRM push
  components/
    Seo.astro                 ← shared <Seo> (rendered by BaseLayout)
    Header.astro  Footer.astro
    ui/*                      ← shadcn/ui primitives (vendored)
    ContactForm.tsx           ← the form island
  layouts/
    BaseLayout.astro          ← wraps every page (SEO, JSON-LD, GA4, Header, Footer)
    BlogPost.astro            ← article layout + Article JSON-LD
  content.config.ts           ← "blog" collection schema
  content/blog/*.mdx          ← blog posts
  pages/
    index.astro  contact.astro
    blog/index.astro  blog/[...slug].astro  blog/tags/[tag].astro
    rss.xml.ts  llms.txt.ts
  actions/index.ts            ← the ONE Astro Action (forms pipeline)
tests/lead*.test.ts           ← Vitest tests for schema, payloads, ordering, and failures
```

---

## 4. Conventions

### MCP docs access

The Astro Docs MCP server is intentionally configured in **two committed project files**:

- `.mcp.json` exposes the remote HTTP server (`astro-docs`) for Claude Code and tools that read
  the common MCP JSON shape.
- `.codex/config.toml` exposes the same server to Codex through `npx -y mcp-remote`, matching
  Astro's Codex CLI guidance.

Do not add `mcp-remote` to `package.json` and do not change the locked dependency stack for MCP.
The docs server is remote; the Codex bridge is fetched automatically by `npx` when an agent needs
it.

### Project skills

Project skills are mirrored in both `.agents/skills/` and `.claude/skills/` so Codex-style
agents and Claude Code see the same operating playbooks. Keep the two trees equivalent when
editing local `zikra-*` skills.

External skills are tracked in `skills-lock.json` with source repo, skill path, and content hash.
Use `npx skills list --json` to verify project skill discovery after installs or updates.

### Path alias

`@/…` resolves to `src/…` in `.astro`, `.ts`, and `.tsx` files. Configured in
`tsconfig.json`, `astro.config.mjs`, and `vitest.config.ts`. Prefer it over relative imports.

### Site config

```ts
import { SITE, TURNSTILE_SITE_KEY } from "@/config";
```

`SITE` fields: `url`, `name`, `description`, `defaultTitle`, `defaultAuthor`,
`defaultOgImage`, `gaMeasurementId`, `adminEmail`, `emailFromName`, `z360Enabled`,
`z360InquiriesUrl`, `telephone?`, `address?`. `TURNSTILE_SITE_KEY` is the **public**
Turnstile site key (Cloudflare test key by default). Only non-secret, build-time values
belong here — they ship to the browser.

### Layout & SEO

```astro
---
import BaseLayout from "@/layouts/BaseLayout.astro";
---

<BaseLayout title="…" description="…"> …page content… </BaseLayout>
```

`BaseLayout` props: `{ title?, description?, canonical?, image?, noindex?, type? }` where
`type` is `"website" | "article"`. It already renders the shared `<Seo>` (astro-seo),
sitewide LocalBusiness JSON-LD, GA4-via-Partytown, `Header`, and `Footer`.

Pages **only wrap their content**. Do **not** add your own `<html>`/`<head>`/`<body>` and
do **not** duplicate SEO tags — that is `BaseLayout`'s job.

### Islands vs static (default to zero JS)

Pages are static and ship no JS by default. Add interactivity only where it's needed, as a
React island with an explicit `client:*` directive (`client:load`, `client:visible`, `client:idle`).
Keep islands small; do server work in the Action, not the browser.

- shadcn/ui primitives live in `@/components/ui/*` (already generated): `button`, `input`,
  `textarea`, `label`, `select`, `checkbox`, `radio-group`, `form`, `card`, `dialog`,
  `sheet`, `dropdown-menu`, `navigation-menu`, `accordion`, `tabs`, `badge`, `avatar`,
  `separator`, `tooltip`, `sonner` (exports `Toaster`).
- Class-merge helper: `cn` from `@/lib/utils`.
- `button` also exports `buttonVariants` — style a plain `<a>` as a button with **zero JS**
  instead of shipping an island just to make a link look like a button.

### Content collection

The `blog` collection is defined in `src/content.config.ts`. Frontmatter: `title`,
`description` (50–170 chars), `pubDate` (date), `updatedDate?` (date), `author` (defaults to
`SITE.defaultAuthor`), `tags` (`string[]`), `image?` (`astro:assets` `image()`), `imageAlt?`,
`draft` (default `false`), `canonical?`.

```ts
import { getCollection, render } from "astro:content";
const posts = await getCollection("blog");
// entry.id is the filename slug; const { Content } = await render(entry);
```

Filter out `draft: true` in production listings.

### Accessibility

Labels tied to inputs (`htmlFor`/`id`), meaningful `alt` text (via `astro:assets`), one
semantic `<h1>` per page with correct heading order, and visible focus states. `jsx-a11y`
and Astro's a11y rules run in ESLint.

---

## 5. Forms pipeline (the important part)

One flow, one Action. **shadcn form island (`ContactForm.tsx`) → the single Astro Action in
`src/actions/index.ts`.** The React island calls the Action as JSON through `astro:actions`;
if a future no-JS form is added, deliberately change that Action path to `accept: "form"` and
update the skills/docs together. The Action delegates to the testable lead pipeline, in order:

1. **Verifies Turnstile** (`src/lib/turnstile.ts`) against `TURNSTILE_SECRET`.
2. **Backs up the lead to R2** as `leads/<id>.json` (`src/lib/r2.ts`, binding `LEADS_BUCKET`).
3. **Emails the admin via Plunk** — `POST https://api.useplunk.com/v1/send` with
   `Authorization: Bearer <PLUNK_API_KEY>` (`src/lib/plunk.ts`).
4. **Optionally POSTs to Z360** (`src/lib/z360.ts`) when `SITE.z360Enabled` **and**
   `Z360_TOKEN` are both present.

**The R2 backup happens BEFORE the Z360 push (and before/independent of a mail failure) so a
downstream outage never drops a lead.** Validate the payload with zod (`src/lib/schema.ts`)
on both the client (react-hook-form resolver) and the server (the Action).

### Secrets rule (critical, non-negotiable)

- `TURNSTILE_SECRET` and `PLUNK_API_KEY` are declared as required Worker Secrets in
  `wrangler.jsonc`, validated by Wrangler on deploy, and included in
  `worker-configuration.d.ts`. `Z360_TOKEN` is optional and only required on sites that enable
  the CRM push.
- These secrets live **only** in Cloudflare Worker Secrets (`wrangler secret put <NAME>`) and
  are imported server-side from **`cloudflare:workers`**, typed by Wrangler-generated bindings.
- **Never** read secrets from `import.meta.env` or `process.env`, and **never** hardcode them.
- **Never commit secrets.** Local dev uses a **gitignored `.dev.vars`** (copy from
  `.dev.vars.example`). The public Turnstile **site** key and other non-secret config live in
  `src/config.ts`.
- The R2 binding `LEADS_BUCKET` is declared in `wrangler.jsonc` (bucket `zikra-leads`). Rename
  and create it per site with `wrangler r2 bucket create <name>`.

---

## 6. Blog

MDX content collection in `src/content/blog/` with a typed schema in `src/content.config.ts`.
`BlogPost.astro` is the article layout (renders Article JSON-LD); `blog/[...slug].astro`
renders a post, `blog/index.astro` lists posts, `blog/tags/[tag].astro` lists by tag. RSS is
served at `/rss.xml` (`@astrojs/rss`) and an LLM-friendly index at `/llms.txt`.

---

## 7. SEO

- Shared `<Seo>` (astro-seo) on **every** page via `BaseLayout` — never duplicate it.
- **LocalBusiness** JSON-LD sitewide + **Article** JSON-LD on blog posts (astro-seo-schema).
- `sitemap.xml` (`@astrojs/sitemap`), `robots.txt` (`astro-robots-txt`, references the sitemap).
- GA4 via `@astrojs/partytown`, keyed by `SITE.gaMeasurementId` (empty string disables it).
- Images via `astro:assets` (`<Image>` / `getImage`) — optimized at build time, always with `alt`.

Run the **`zikra-seo-audit`** skill before launch.

---

## 8. State management

- **Nanostores** (+ `@nanostores/react`) for state shared **across islands**.
- React `useState` for state that lives **inside one island**.
- **Not** Redux. No Cloudflare KV.

---

## 9. Commands

All via pnpm.

| Command                 | What it does                                                 |
| ----------------------- | ------------------------------------------------------------ |
| `pnpm dev`              | `astro dev` — local dev server                               |
| `pnpm build`            | `astro build` + preserve `dist/client/.assetsignore`         |
| `pnpm preview`          | `pnpm build && wrangler dev` — run the built Worker locally  |
| `pnpm sync`             | `astro sync` — regenerate content/types                      |
| `pnpm check`            | `astro check` — Astro + template type diagnostics            |
| `pnpm typecheck`        | `astro sync && tsc --noEmit`                                 |
| `pnpm lint`             | `eslint .`                                                   |
| `pnpm lint:fix`         | `eslint . --fix`                                             |
| `pnpm format`           | `prettier --write .`                                         |
| `pnpm format:check`     | `prettier --check .`                                         |
| `pnpm test`             | `vitest run`                                                 |
| `pnpm test:watch`       | `vitest`                                                     |
| `pnpm audit`            | fail on high/critical dependency advisories                  |
| `pnpm verify:build`     | verify build artifacts and JavaScript budgets                |
| `pnpm cf-typegen`       | regenerate `worker-configuration.d.ts` from `wrangler.jsonc` |
| `pnpm cf-typegen:check` | verify generated Worker types are current in CI              |

Before opening a PR, run: `pnpm install --frozen-lockfile && pnpm cf-typegen:check && pnpm format:check && pnpm check && pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm verify:build && pnpm audit`.
CI must be green to merge.

---

## 10. Forking & spinning up a new site (high level)

1. **Use this template** on GitHub (or `degit`) to create the site repo, then `pnpm install`.
2. Edit **`src/config.ts`** (`SITE` + `TURNSTILE_SITE_KEY`) and drop in brand assets.
3. `cp .dev.vars.example .dev.vars` and fill local secrets; `pnpm dev`.
4. Deploy on Cloudflare: create the Worker project, `wrangler r2 bucket create <name>` and
   point `wrangler.jsonc` at it, run `pnpm cf-typegen`, `wrangler secret put` the real secrets, connect the domain +
   DNS, add 301s via **Cloudflare Bulk Redirects**, verify Search Console and submit the sitemap.

Full step-by-step lives in **`README.md`**; the deploy checklist is the **`zikra-deploy`** skill.

---

## 11. Skills catalog

Zikra skills live in both `.agents/skills/` and `.claude/skills/`. Reach for the matching skill
instead of improvising.

| Skill             | Use it when…                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `zikra-page`      | Adding a new static page — correct `BaseLayout` usage, SEO props, zero-JS default.                                       |
| `zikra-blog-post` | Writing a new MDX blog post — frontmatter schema, images, tags, drafts.                                                  |
| `zikra-form`      | Adding or changing a form — the ContactForm island, zod schema, and the Action pipeline (Turnstile → R2 → Plunk → Z360). |
| `zikra-seo-audit` | Pre-launch SEO review — meta, canonicals, JSON-LD, sitemap/robots, GA4, alt text.                                        |
| `zikra-deploy`    | Shipping a site to Cloudflare — R2 bucket, secrets, domain/DNS, redirects, Search Console.                               |
| `zikra-update`    | A coordinated dependency update or future framework-major migration.                                                     |

Installed external skills:

| Skill                    | Source / use                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| `frontend-design`        | Anthropic skill for rich frontend artifacts and visual QA.                               |
| `cloudflare`             | Cloudflare platform guidance and docs routing.                                           |
| `wrangler`               | Cloudflare Workers CLI commands, deploys, secrets, R2, and typegen.                      |
| `workers-best-practices` | Workers production review: bindings, secrets, observability, promises, runtime patterns. |
| `turnstile-spin`         | Turnstile setup and verification workflow.                                               |
| `web-perf`               | Performance/Core Web Vitals audits.                                                      |
| `seo-audit`              | Marketing SEO audit helper, used alongside `zikra-seo-audit`.                            |
