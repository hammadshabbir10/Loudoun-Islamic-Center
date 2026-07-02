import type { LeadInput } from "@/lib/schema";

const PLUNK_SEND_URL = "https://api.useplunk.com/v1/send";

export interface PlunkPayload {
  to: string;
  subject: string;
  body: string;
  subscribed: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Build the Plunk transactional-email payload for a new lead notification.
 * Pure — no fetch — so it can be unit-tested.
 */
export function buildPlunkPayload(
  lead: LeadInput,
  opts: { adminEmail: string; siteName: string },
): PlunkPayload {
  const siteName = escapeHtml(opts.siteName);
  const name = escapeHtml(lead.name);
  const email = escapeHtml(lead.email);
  const phone = lead.phone ? escapeHtml(lead.phone) : "—";
  const message = escapeHtml(lead.message);

  return {
    to: opts.adminEmail,
    subject: `New lead from ${opts.siteName}: ${lead.name}`,
    body: `<h2>New lead from ${siteName}</h2>
<p><strong>Name:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
<p><strong>Phone:</strong> ${phone}</p>
<p><strong>Message:</strong></p>
<p>${message}</p>`,
    subscribed: false,
  };
}

/**
 * Send a prepared payload to Plunk. Returns the raw Response so the caller
 * decides how to handle failures (the Action logs but never fails on this).
 */
export async function sendViaPlunk(
  payload: PlunkPayload,
  apiKey: string,
): Promise<Response> {
  return fetch(PLUNK_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
