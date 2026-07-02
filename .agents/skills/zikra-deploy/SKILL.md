---
name: zikra-deploy
description: Use when deploying a Zikra site to Cloudflare for the first time or setting up its production infrastructure — covers creating the Worker project (Git integration or wrangler), setting the TURNSTILE_SECRET / PLUNK_API_KEY / optional Z360_TOKEN secrets, creating and binding the LEADS_BUCKET R2 bucket, connecting the domain and DNS, adding 301 redirects via Cloudflare Bulk Redirects, and verifying Search Console with a sitemap submission.
---

# Deploy a Zikra site to Cloudflare

The build emits a Cloudflare Worker (`@astrojs/cloudflare`, Workers output). Static pages are served as assets; the Worker handles only on-demand routes (the Actions endpoint). Do these steps **in order** — the R2 bucket and secrets must exist before the first form submission works.

Prerequisites: `wrangler` is installed (it's a dev dependency — use `pnpm wrangler …` or `pnpm dlx wrangler …`). Authenticate once:

```bash
pnpm wrangler login
```

## 1. Set per-site config

Before anything else, edit `src/config.ts`:
- `url` — the real production URL (no trailing slash).
- `name`, `description`, `defaultTitle`, `adminEmail`, `emailFromName`.
- `gaMeasurementId` (leave empty to disable GA).
- `z360Enabled` + `z360InquiriesUrl` if using the CRM push.
- Replace `TURNSTILE_SITE_KEY` with the real Turnstile **site** key (the default is Cloudflare's test key).

Also set a unique `name` and R2 `bucket_name` in `wrangler.jsonc` per site (see step 3). After
editing `wrangler.jsonc`, run:

```bash
pnpm cf-typegen
```

Commit the regenerated `worker-configuration.d.ts` so CI can verify bindings and required
secrets stay in sync.

## 2. Create the Worker project

Pick **one** path.

**Option A — Cloudflare Git integration (recommended for auto-deploy).**
In the Cloudflare dashboard → Workers & Pages → Create → connect the GitHub repo. Set:
- Build command: `pnpm build`
- Deploy command / output: the adapter's Worker output (`dist/`).
Pushes to the default branch then auto-build and deploy. Preview deployments are created for other branches / PRs (used in `zikra-update`).

**Option B — wrangler (manual / CI).**
```bash
pnpm build
pnpm wrangler deploy
```

## 3. Create and bind the R2 bucket

The bucket backs the "never lose a lead" pipeline. Create it once, using the `bucket_name` you set in `wrangler.jsonc`:

```bash
pnpm wrangler r2 bucket create zikra-leads     # use this site's bucket name
```

The binding is already declared in `wrangler.jsonc`:

```jsonc
"r2_buckets": [
  { "binding": "LEADS_BUCKET", "bucket_name": "zikra-leads" }
]
```

Keep `binding` as `LEADS_BUCKET` (the code reads `env.LEADS_BUCKET`); only change `bucket_name`. If deploying via the dashboard (Option A), the binding still comes from `wrangler.jsonc` — just make sure the bucket name matches a bucket that exists.

## 4. Set the secrets

Secrets are **never** in `wrangler.jsonc`, `src/config.ts`, or the repo. Set them on the deployed Worker:

```bash
pnpm wrangler secret put TURNSTILE_SECRET     # Cloudflare Turnstile secret key
pnpm wrangler secret put PLUNK_API_KEY        # Plunk transactional email API key
pnpm wrangler secret put Z360_TOKEN           # OPTIONAL — only if SITE.z360Enabled
```

Each command prompts for the value. `TURNSTILE_SECRET` and `PLUNK_API_KEY` are declared as
required in `wrangler.jsonc`, so `wrangler deploy` fails if either production secret is missing.
`Z360_TOKEN` is optional and only needed when `SITE.z360Enabled` is true. Local dev uses
`.dev.vars` (copy `.dev.vars.example`), which is gitignored. The default test Turnstile keys pass
locally but **must** be replaced with production keys here.

## 5. Connect the domain + DNS

In the Cloudflare dashboard:
1. Add the site's zone to Cloudflare (or confirm it's already there) and point the registrar's nameservers at Cloudflare.
2. Under the Worker → Settings → Domains & Routes, add a **Custom Domain** for the production hostname (e.g. `example.com` and `www.example.com`). Cloudflare provisions the DNS record and TLS certificate automatically.
3. Decide apex vs `www` and set a redirect from the non-canonical host to the canonical one (matching `SITE.url`).

## 6. 301 redirects (migrations)

For a site replacing an old one, preserve SEO with **Cloudflare Bulk Redirects** (dashboard → Account Home → Bulk Redirects):
1. Create a Bulk Redirect List mapping each old URL → new URL.
2. Use **301 (permanent)** for moved pages.
3. Enable a Bulk Redirect Rule that uses the list.
4. Spot-check a few old URLs resolve to the new destinations.

## 7. Verify & submit to Search Console

1. Add the property in Google Search Console (Domain property preferred — verify via the DNS TXT record in Cloudflare DNS).
2. Submit the sitemap: `https://<domain>/sitemap-index.xml`.
3. Use URL Inspection on the home page and a key post; request indexing.
4. Confirm `https://<domain>/robots.txt` references the sitemap and doesn't disallow the site.

## Post-deploy smoke test

- [ ] Home page and a blog post load over HTTPS on the production domain.
- [ ] Submit the contact form → a JSON object appears in the R2 bucket, the admin notification email arrives, and (if enabled) the lead reaches Z360.
- [ ] `sitemap-index.xml`, `robots.txt`, and `/llms.txt` are reachable.
- [ ] Run the `zikra-seo-audit` checklist against the live site.
