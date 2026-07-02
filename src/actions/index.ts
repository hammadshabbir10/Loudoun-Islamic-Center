import { defineAction, ActionError } from "astro:actions";

import { SITE } from "@/config";
import { leadSchema } from "@/lib/schema";
import { verifyTurnstile } from "@/lib/turnstile";
import { buildLeadRecord, backupLead } from "@/lib/r2";
import { buildPlunkPayload, sendViaPlunk } from "@/lib/plunk";
import { pushToZ360 } from "@/lib/z360";

export const server = {
  submitLead: defineAction({
    accept: "json",
    input: leadSchema,
    handler: async (input, context) => {
      const env = context.locals.runtime.env;

      // 1. Verify Turnstile — reject spam before doing any work.
      const passed = await verifyTurnstile(
        input.turnstileToken,
        env.TURNSTILE_SECRET,
        context.clientAddress,
      );
      if (!passed) {
        throw new ActionError({
          code: "FORBIDDEN",
          message: "Spam check failed. Please try again.",
        });
      }

      // 2. Back the lead up to R2 FIRST — we never proceed without it, so an
      //    outage in email/CRM downstream can never drop a lead.
      const record = buildLeadRecord(input, {
        id: crypto.randomUUID(),
        receivedAt: new Date().toISOString(),
        source: "website",
      });
      try {
        await backupLead(env.LEADS_BUCKET, record);
      } catch (err) {
        console.error("R2 lead backup failed", err);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "We couldn't save your message. Please try again.",
        });
      }

      // 3. Notify the admin via Plunk (best-effort — the lead is already safe).
      if (env.PLUNK_API_KEY) {
        try {
          const res = await sendViaPlunk(
            buildPlunkPayload(input, {
              adminEmail: SITE.adminEmail,
              siteName: SITE.name,
            }),
            env.PLUNK_API_KEY,
          );
          if (!res.ok) {
            console.error(
              `Plunk email failed for lead ${record.id}: ${res.status}`,
            );
          }
        } catch (err) {
          console.error(`Plunk email errored for lead ${record.id}`, err);
        }
      } else {
        console.warn(
          `Plunk email skipped for lead ${record.id}: PLUNK_API_KEY not set`,
        );
      }

      // 4. Optionally push to Z360 (best-effort — the lead is already safe).
      if (SITE.z360Enabled && env.Z360_TOKEN) {
        try {
          const res = await pushToZ360(
            SITE.z360InquiriesUrl,
            env.Z360_TOKEN,
            input,
          );
          if (!res.ok) {
            console.error(
              `Z360 push failed for lead ${record.id}: ${res.status}`,
            );
          }
        } catch (err) {
          console.error(`Z360 push errored for lead ${record.id}`, err);
        }
      }

      return { ok: true, id: record.id };
    },
  }),
};
