import type { SiteConfig } from "@/config";
import { buildPlunkPayload, sendViaPlunk } from "@/lib/plunk";
import { backupLead, buildLeadRecord } from "@/lib/r2";
import type { LeadInput } from "@/lib/schema";
import { verifyTurnstile } from "@/lib/turnstile";
import { pushToZ360 } from "@/lib/z360";

export type LeadPipelineFailure = "spam" | "storage";

export class LeadPipelineError extends Error {
  constructor(public readonly failure: LeadPipelineFailure) {
    super(failure);
    this.name = "LeadPipelineError";
  }
}

export interface LeadPipelineBindings {
  LEADS_BUCKET: R2Bucket;
  TURNSTILE_SECRET: string;
  PLUNK_API_KEY?: string;
  Z360_TOKEN?: string;
}

export interface LeadPipelineDependencies {
  verifyTurnstile: typeof verifyTurnstile;
  backupLead: typeof backupLead;
  sendViaPlunk: typeof sendViaPlunk;
  pushToZ360: typeof pushToZ360;
  randomUUID: () => string;
  now: () => string;
  logger: Pick<Console, "error" | "warn">;
}

export interface LeadPipelineOptions {
  clientAddress?: string;
  site: Pick<
    SiteConfig,
    "adminEmail" | "name" | "z360Enabled" | "z360InquiriesUrl"
  >;
}

const defaultDependencies: LeadPipelineDependencies = {
  verifyTurnstile,
  backupLead,
  sendViaPlunk,
  pushToZ360,
  randomUUID: () => crypto.randomUUID(),
  now: () => new Date().toISOString(),
  logger: console,
};

function serializeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Execute the durable lead pipeline independently from Astro's Action layer.
 * Dependencies are injectable so ordering and failure policies remain covered
 * by fast unit tests without emulating the Workers runtime.
 */
export async function processLead(
  input: LeadInput,
  bindings: LeadPipelineBindings,
  options: LeadPipelineOptions,
  dependencies: Partial<LeadPipelineDependencies> = {},
): Promise<{ ok: true; id: string }> {
  const deps = { ...defaultDependencies, ...dependencies };

  const passed = await deps.verifyTurnstile(
    input.turnstileToken,
    bindings.TURNSTILE_SECRET,
    options.clientAddress,
  );
  if (!passed) throw new LeadPipelineError("spam");

  const record = buildLeadRecord(input, {
    id: deps.randomUUID(),
    receivedAt: deps.now(),
    source: "website",
  });

  try {
    await deps.backupLead(bindings.LEADS_BUCKET, record);
  } catch (error) {
    deps.logger.error(
      JSON.stringify({
        event: "lead_backup_failed",
        leadId: record.id,
        error: serializeError(error),
      }),
    );
    throw new LeadPipelineError("storage");
  }

  if (bindings.PLUNK_API_KEY) {
    try {
      const response = await deps.sendViaPlunk(
        buildPlunkPayload(input, {
          adminEmail: options.site.adminEmail,
          siteName: options.site.name,
        }),
        bindings.PLUNK_API_KEY,
      );
      if (!response.ok) {
        deps.logger.error(
          JSON.stringify({
            event: "lead_email_failed",
            leadId: record.id,
            status: response.status,
          }),
        );
      }
    } catch (error) {
      deps.logger.error(
        JSON.stringify({
          event: "lead_email_errored",
          leadId: record.id,
          error: serializeError(error),
        }),
      );
    }
  } else {
    deps.logger.warn(
      JSON.stringify({ event: "lead_email_skipped", leadId: record.id }),
    );
  }

  if (options.site.z360Enabled && bindings.Z360_TOKEN) {
    try {
      const response = await deps.pushToZ360(
        options.site.z360InquiriesUrl,
        bindings.Z360_TOKEN,
        input,
      );
      if (!response.ok) {
        deps.logger.error(
          JSON.stringify({
            event: "lead_z360_failed",
            leadId: record.id,
            status: response.status,
          }),
        );
      }
    } catch (error) {
      deps.logger.error(
        JSON.stringify({
          event: "lead_z360_errored",
          leadId: record.id,
          error: serializeError(error),
        }),
      );
    }
  }

  return { ok: true, id: record.id };
}
