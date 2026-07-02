import { z } from "zod";

/**
 * Email validation via an explicit regex rather than zod's string `.email()`.
 * It's deterministic across every runtime and sidesteps the string `.email()`
 * deprecation coming in zod v4 (moved to top-level `z.email()`) — one less
 * thing to touch when the zikra-update skill bumps the major.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The shared lead schema — the single source of truth for what a valid
 * contact submission looks like. Imported by BOTH the client island
 * (react-hook-form + zodResolver) and the server Astro Action, so it MUST
 * NOT import anything from "astro:*" (keeps it plain-Vitest testable).
 */
export const leadSchema = z.object({
  name: z.string().min(2, "Please enter your name.").max(100),
  email: z
    .string()
    .min(1, "Please enter your email address.")
    .regex(EMAIL_RE, "Please enter a valid email address."),
  phone: z.string().optional(),
  message: z
    .string()
    .min(10, "Please add a little more detail (10+ characters).")
    .max(5000),
  /** The Cloudflare Turnstile response token, set by the widget callback. */
  turnstileToken: z.string().min(1, "Please complete the spam check."),
});

export type LeadInput = z.infer<typeof leadSchema>;
