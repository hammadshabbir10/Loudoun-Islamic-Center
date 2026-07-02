import type { LeadInput } from "@/lib/schema";

const PLUNK_SEND_URL = "https://api.useplunk.com/v1/send";

export interface PlunkPayload {
  to: string;
  subject: string;
  body: string;
  subscribed: boolean;
}

/**
 * Build the Plunk transactional-email payload for a new lead notification.
 * Pure — no fetch — so it can be unit-tested.
 */
export function buildPlunkPayload(
  lead: LeadInput,
  opts: { adminEmail: string; siteName: string },
): PlunkPayload {
  return {
    to: opts.adminEmail,
    subject: `New lead from ${opts.siteName}: ${lead.name}`,
    body: `<h2>New lead from ${opts.siteName}</h2>
<p><strong>Name:</strong> ${lead.name}</p>
<p><strong>Email:</strong> ${lead.email}</p>
<p><strong>Phone:</strong> ${lead.phone ?? "—"}</p>
<p><strong>Message:</strong></p>
<p>${lead.message}</p>`,
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
