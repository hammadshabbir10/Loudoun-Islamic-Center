/**
 * Per-site configuration — the ONE file every forked Zikra site edits first.
 *
 * Rules:
 *  - Only non-secret, build-time values live here (they ship to the browser).
 *  - Secrets (Turnstile secret, Plunk key, Z360 token) NEVER go here — they
 *    live in Cloudflare Worker Secrets / .dev.vars and are read from the
 *    Worker runtime env. See .dev.vars.example and AGENTS.md.
 */

export interface SiteAddress {
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode: string;
  addressCountry: string;
}

export interface SiteConfig {
  /** Canonical production URL, no trailing slash. Used for canonicals, OG, sitemap, RSS. */
  url: string;
  /** Brand / business name. */
  name: string;
  /** Default meta description (fallback when a page sets none). ~150–160 chars. */
  description: string;
  /** <title> used on the home page and as the fallback title. */
  defaultTitle: string;
  /** Default byline for blog posts that don't set `author`. */
  defaultAuthor: string;
  /** Static Open Graph image, served from /public. */
  defaultOgImage: string;
  /** GA4 Measurement ID, e.g. "G-XXXXXXXXXX". Empty string disables analytics. */
  gaMeasurementId: string;
  /** Address that receives form submissions via Plunk. */
  adminEmail: string;
  /** Sender name shown on notification + autoresponder emails. */
  emailFromName: string;
  /** Turn on the optional Z360 CRM push. Also requires the Z360_TOKEN secret. */
  z360Enabled: boolean;
  /** Z360 inquiries endpoint. Confirm the exact URL/payload with the Z360 team. */
  z360InquiriesUrl: string;
  /** Optional phone number for LocalBusiness structured data. */
  telephone?: string;
  /** Optional postal address for LocalBusiness structured data. */
  address?: SiteAddress;
}

export const SITE: SiteConfig = {
  url: "https://www.loudounislamiccenter.org",
  name: "Loudoun Islamic Center",
  description:
    "Loudoun Islamic Center (LIC) is a masjid in Leesburg, VA serving the Muslim community of Loudoun County with daily prayers, Jumu'ah, youth education, and community programs.",
  defaultTitle: "Loudoun Islamic Center — Masjid in Leesburg, VA",
  defaultAuthor: "Loudoun Islamic Center",
  defaultOgImage: "/og-default.png",
  gaMeasurementId: "",
  adminEmail: "info@loudounislamiccenter.org",
  emailFromName: "Loudoun Islamic Center",
  z360Enabled: false,
  z360InquiriesUrl: "https://api.z360.example/v1/inquiries",
  telephone: "+1-877-331-5005",
  address: {
    streetAddress: "1507 Dodona Terrace SE, Suite 210",
    addressLocality: "Leesburg",
    addressRegion: "VA",
    postalCode: "20175",
    addressCountry: "US",
  },
};

/**
 * Cloudflare Turnstile SITE key (public — safe to ship to the browser).
 * The default is Cloudflare's "always passes" TEST key so the demo form works
 * locally. Replace with your real site key before launch. The matching secret
 * lives in the Worker env (TURNSTILE_SECRET), never here.
 */
export const TURNSTILE_SITE_KEY = "1x00000000000000000000AA";
