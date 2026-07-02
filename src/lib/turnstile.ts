const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Build the x-www-form-urlencoded body for the Turnstile siteverify call.
 * Pure and fetch-free so it can be unit-tested directly.
 */
export function buildTurnstileBody(
  token: string,
  secret: string,
  remoteIp?: string,
): URLSearchParams {
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);
  return body;
}

/**
 * Verify a Turnstile token against Cloudflare. Returns the `success` flag.
 */
export async function verifyTurnstile(
  token: string,
  secret: string,
  remoteIp?: string,
): Promise<boolean> {
  const res = await fetch(SITEVERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: buildTurnstileBody(token, secret, remoteIp),
  });
  const data = (await res.json()) as { success: boolean };
  return data.success;
}
