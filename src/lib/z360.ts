import type { LeadInput } from "@/lib/schema";

export interface Z360Payload {
  name: string;
  email: string;
  phone?: string;
  message: string;
  source: "website";
}

/**
 * Build the Z360 inquiry payload for a lead. Pure — unit-testable.
 */
export function buildZ360Payload(lead: LeadInput): Z360Payload {
  return {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    message: lead.message,
    source: "website",
  };
}

/**
 * Push a lead to the Z360 CRM inquiries endpoint.
 *
 * OPEN ITEM: the exact inquiries endpoint URL and payload shape still need to
 * be confirmed with the Z360 team — SITE.z360InquiriesUrl is a placeholder.
 * Returns the raw Response so the caller logs but never fails on this.
 */
export async function pushToZ360(
  url: string,
  token: string,
  lead: LeadInput,
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildZ360Payload(lead)),
  });
}
