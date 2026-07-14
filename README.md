# zikra-astro-starter

The reusable foundation every Zikra agency site is forked from. It's a **GitHub template
repo**: you create a new repo from it, edit one config file, add content, and deploy to the
Cloudflare edge. Every page is prerendered static HTML; a single Worker route powers a
"never lose a lead" contact-form pipeline.

**Stack:** Astro 7 · Cloudflare Workers · Tailwind v4 · shadcn/ui (React islands) · MDX blog ·
astro-seo · Vitest.

> **Astro is pinned to the verified Astro 7 major.** Do not upgrade framework majors or locked
> dependencies ad hoc. Major changes are coordinated in the starter with the `zikra-update`
> skill, green CI, and a Cloudflare preview before forks adopt them.

- **Daily reference (team + agents):** [`AGENTS.md`](./AGENTS.md)
- **Building on the template:** [`CONTRIBUTING.md`](./CONTRIBUTING.md)

---

## Prerequisites

- **Node.js ≥ 22** and **pnpm** (repo pins `pnpm@11`; `corepack enable` will honor it).
- A **Cloudflare account** (Workers + R2) and **Wrangler** (installed as a dev dependency).
- A **Plunk** account for transactional email — <https://useplunk.com>.
- Optional: a **Z360** CRM token if you want leads pushed to the CRM.

---

## Quickstart (local)

```bash
# 1. Create a repo from this template ("Use this template" on GitHub),
#    or scaffold directly:
pnpm dlx degit zikra/zikra-astro-starter my-site
cd my-site

# 2. Install (uses the committed lockfile — do not add/upgrade deps).
pnpm install

# 3. Local secrets for the Worker runtime (gitignored).
cp .dev.vars.example .dev.vars   # then fill in real values

# 4. Run the dev server.
pnpm dev
```

The defaults in `.dev.vars.example` and `src/config.ts` use Cloudflare's Turnstile **test**
keys, so the demo contact form works out of the box without real credentials.

### AI docs access

This repo commits project-level MCP configuration so coding agents can pull current Astro docs
instead of relying only on model memory:

- **Claude Code:** uses `.mcp.json`, which points `astro-docs` at Astro's remote MCP server.
- **Codex CLI:** uses `.codex/config.toml`, which starts `mcp-remote` through `npx -y` and
  bridges Codex to the same remote Astro Docs MCP server.

There is no app dependency to install for this. The Astro Docs MCP server runs remotely at
`https://mcp.docs.astro.build/mcp`; Codex downloads the tiny `mcp-remote` bridge on first use
through `npx` if it is not already cached locally. In other words, after `pnpm install`, a
developer can open this repo in Claude Code or Codex and the Astro docs tool is discovered from
the committed project config.

### AI skill access

Project skills are mirrored into **`.agents/skills`** and **`.claude/skills`** so Codex and
Claude Code get the same local playbooks. The repo ships the six Zikra skills plus the requested
external skills: `frontend-design`, `cloudflare`, `wrangler`, `workers-best-practices`,
`turnstile-spin`, `web-perf`, and `seo-audit`.

Run `npx skills list --json` to verify discovery after a fresh clone or skill update. External
skill provenance is tracked in `skills-lock.json`.

---

## Spinning up a new site

### 1. Configure the site

Edit **`src/config.ts`** — this is the one file every site touches first:

- `SITE`: `url` (canonical, no trailing slash), `name`, `description`, `defaultTitle`,
  `defaultAuthor`, `defaultOgImage`, `gaMeasurementId` (empty string disables GA4),
  `adminEmail`, `emailFromName`, `z360Enabled`, `z360InquiriesUrl`, and optional `telephone`
  / `address` for LocalBusiness structured data.
- `TURNSTILE_SITE_KEY`: your **public** Turnstile site key (test key by default).

Add brand assets: replace `public/og-default.png` (and favicon), and place any local images
imported through `astro:assets`.

Write content: edit `src/pages/index.astro` and `src/pages/contact.astro`, and add posts under
`src/content/blog/*.mdx`. Use the `zikra-page` and `zikra-blog-post` skills.

### 2. Provision Cloudflare

```bash
# Create (or select) the Worker project for this site, then:

# R2 bucket for the lead backups — pick a per-site name, then point
# wrangler.jsonc's LEADS_BUCKET.bucket_name at it.
wrangler r2 bucket create my-site-leads

# Worker Secrets (production). NEVER commit these; NEVER put them in wrangler.jsonc.
wrangler secret put TURNSTILE_SECRET
wrangler secret put PLUNK_API_KEY
wrangler secret put Z360_TOKEN        # only if z360Enabled is true

# Regenerate Worker binding/secret types after editing wrangler.jsonc.
pnpm cf-typegen
```

> **Secrets rule:** `TURNSTILE_SECRET` and `PLUNK_API_KEY` are required Worker Secrets declared
> in `wrangler.jsonc`; `Z360_TOKEN` is optional and only needed when `z360Enabled` is true. Secrets
> live only in Worker Secrets (prod) / the gitignored `.dev.vars` (local), and are imported on the
> server from `cloudflare:workers`. Never `import.meta.env`, never `process.env`, never hardcoded.

### 3. Ship & verify

- **Deploy** the site (build then `wrangler deploy`, or via the connected Git integration).
- **Connect the domain + DNS** in the Cloudflare dashboard.
- **Add 301 redirects** for any legacy URLs via **Cloudflare Bulk Redirects** (not app code).
- **Verify Google Search Console** for the domain and **submit the sitemap** (`/sitemap-index.xml`).
- Run the **`zikra-seo-audit`** skill and follow the **`zikra-deploy`** checklist.

---

## Command reference

| Command                 | Description                                                      |
| ----------------------- | ---------------------------------------------------------------- |
| `pnpm dev`              | Start the local dev server (`astro dev`).                        |
| `pnpm build`            | Production build plus safe `dist/client/.assetsignore` handling. |
| `pnpm preview`          | Build, then run the Worker locally (`wrangler dev`).             |
| `pnpm sync`             | Regenerate content collection + Astro types.                     |
| `pnpm check`            | Astro + template type diagnostics (`astro check`).               |
| `pnpm typecheck`        | `astro sync && tsc --noEmit`.                                    |
| `pnpm lint`             | ESLint (`eslint .`).                                             |
| `pnpm lint:fix`         | ESLint with autofix.                                             |
| `pnpm format`           | Prettier write (`prettier --write .`).                           |
| `pnpm format:check`     | Prettier check.                                                  |
| `pnpm test`             | Vitest unit tests (`vitest run`).                                |
| `pnpm test:watch`       | Vitest in watch mode.                                            |
| `pnpm audit`            | Fail on high/critical dependency advisories.                     |
| `pnpm verify:build`     | Verify routes, Worker artifacts, and JavaScript budgets.         |
| `pnpm cf-typegen`       | Regenerate `worker-configuration.d.ts` from Wrangler config.     |
| `pnpm cf-typegen:check` | Verify generated Worker types are current.                       |

Before a PR: `pnpm install --frozen-lockfile && pnpm cf-typegen:check && pnpm format:check && pnpm check && pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm verify:build && pnpm audit`.
CI must be green to merge.

### Keeping forks current

Template releases use the `package.json` version, a matching `vX.Y.Z` Git tag, and the release
notes in `CHANGELOG.md`. Existing sites add this repository as a `starter` remote, compare their
last applied tag with the newest release, and cherry-pick focused shared-infrastructure commits.
Always preserve per-site config, content, assets, and Wrangler bindings during conflicts. Follow
the mirrored `zikra-update` skill and validate on a non-production Cloudflare preview.

---

## Project structure

```
src/
  config.ts              per-site config (SITE, TURNSTILE_SITE_KEY) — edit this first
  layouts/               BaseLayout (SEO/JSON-LD/GA4/Header/Footer), BlogPost
  components/            Seo, Header, Footer, ContactForm island, ui/* (shadcn)
  lib/                   schema, testable lead pipeline, Turnstile, Plunk, R2, Z360
  content/blog/*.mdx     blog posts (typed via content.config.ts)
  pages/                 index, contact, blog/*, rss.xml.ts, llms.txt.ts
  actions/index.ts       the single Astro Action (forms pipeline)
tests/                   Vitest unit tests
scripts/write-assetsignore.mjs preserves dist/client/.assetsignore after build
astro.config.mjs         locked — do not edit per-site
wrangler.jsonc           Worker config: assets + R2 (LEADS_BUCKET)
worker-configuration.d.ts generated Worker binding/secret types
.dev.vars.example        copy to .dev.vars for local secrets
```

See [`AGENTS.md`](./AGENTS.md) for the full architecture, the forms pipeline, and the skills
catalog.

---

## License

Private — internal Zikra template. Not for redistribution.
