---
name: zikra-update
description: Use when safely updating an existing forked Zikra site — pulling starter improvements from the upstream template via a git remote (merge/cherry-pick), deliberately bumping dependencies (mind the Astro 5 → newer-major consideration), running the full green-CI gate (install, check, typecheck, lint, test, build), fixing breakages, and deploying to a Cloudflare preview first before promoting to production.
---

# Safely update an existing Zikra site

Forked sites drift from the `zikra-astro-starter` template. This is how to pull improvements and bump dependencies without breaking a live site. **Never** update straight to production — the gate is green CI **and** a preview deploy.

Always work on a branch, never the default branch:

```bash
git checkout -b chore/update-$(date +%Y%m%d)
```

## 1. Pull starter improvements

Add the template as an upstream remote (once):

```bash
git remote add starter https://github.com/<org>/zikra-astro-starter.git
git fetch starter
```

Then bring in changes deliberately — prefer cherry-picking specific improvements over a blind merge, because forks diverge in the per-site files:

```bash
# Review what's new upstream first:
git log --oneline HEAD..starter/main

# Cherry-pick targeted fixes:
git cherry-pick <sha>

# …or merge the whole upstream branch when the fork is close to template:
git merge starter/main
```

**Protect per-site files during conflicts** — keep *your* version of: `src/config.ts`, `wrangler.jsonc`, `.dev.vars*`, `src/content/blog/*`, `src/assets/*`, and any custom pages. Take *upstream's* version for shared infra (`src/layouts/BaseLayout.astro`, `src/components/Header.astro`/`Footer.astro`, `src/components/Seo.astro`, `src/lib/*`, `src/actions/*`, config like `astro.config.mjs`, `eslint.config.js`, `tsconfig.json`) unless you deliberately customized it. Resolve conflicts file by file.

## 2. Bump dependencies deliberately

The stack is **pinned on purpose**. Astro is locked to **5.x** (a newer major exists, but the spec locks Astro 5). Do **not** casually jump majors.

- Patch/minor within the pinned lines are generally safe — update, then run the full gate below.
- A major bump (Astro 5 → newer, React, Tailwind v4 → next, the Cloudflare adapter, wrangler) is a **separate, intentional migration**: read that package's migration guide, do it on its own branch, and expect breakages. Coordinate with the template — the fork should track whatever majors the starter has adopted, not lead them.
- Use `pnpm` only. After editing versions:

```bash
pnpm install
```

## 3. The green-CI gate

Run the full sequence. Every step must pass before you deploy anything:

```bash
pnpm install
pnpm check        # astro check — types + templates
pnpm typecheck    # astro sync && tsc --noEmit
pnpm lint         # eslint
pnpm test         # vitest run
pnpm build        # astro build — the production build must succeed
```

`pnpm format` (or `pnpm lint:fix`) to auto-fix style. If any step fails, **fix the breakage** before proceeding — do not skip a step or deploy on red. Common breakages after an update: renamed Astro APIs, changed shadcn/Radix props, stricter TypeScript, or a moved config option.

## 4. Deploy to PREVIEW first

Never promote an update to production directly. Ship a Cloudflare **preview** deployment and QA it there.

- **Git integration:** push the branch / open a PR — Cloudflare builds a preview deployment automatically and gives a preview URL.
- **Wrangler:** deploy to a preview environment / non-production Worker (e.g. `pnpm wrangler versions upload`, or a preview-named Worker), not the production one.

On the preview URL, QA:
- [ ] Home, key pages, and a blog post render correctly.
- [ ] The contact form submits end-to-end (lead lands in R2, email sends).
- [ ] Run the `zikra-seo-audit` checklist (metadata, one H1, sitemap, JSON-LD, images, links).
- [ ] No console errors; images optimized; layout intact on mobile.

## 5. Promote to production

Only after green CI **and** a clean preview QA:

- **Git integration:** merge the PR to the default branch → Cloudflare auto-deploys production.
- **Wrangler:** `pnpm build && pnpm wrangler deploy` (or promote the previewed version).

Then smoke-test production (see `zikra-deploy` post-deploy checklist). If anything regresses, roll back to the previous deployment in the Cloudflare dashboard and reopen the branch.

**Rule of thumb: preview-first, green-CI-gated, per-site files protected.**
