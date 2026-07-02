import type { LeadInput } from "@/lib/schema";

export interface LeadRecord {
  id: string;
  receivedAt: string;
  source?: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
}

/**
 * Shape the durable R2 backup record: the lead WITHOUT the turnstileToken
 * (a single-use, worthless-once-verified value), plus id/receivedAt/source.
 * Pure so it can be unit-tested.
 */
export function buildLeadRecord(
  lead: LeadInput,
  meta: { id: string; receivedAt: string; source?: string },
): LeadRecord {
  return {
    id: meta.id,
    receivedAt: meta.receivedAt,
    source: meta.source,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    message: lead.message,
  };
}

/**
 * Write the lead record to R2 as JSON at "leads/<id>.json". This is the
 * "never lose a lead" backup and runs before any downstream integration.
 */
export async function backupLead(
  bucket: R2Bucket,
  record: LeadRecord,
): Promise<void> {
  await bucket.put(`leads/${record.id}.json`, JSON.stringify(record, null, 2), {
    httpMetadata: { contentType: "application/json" },
  });
}
