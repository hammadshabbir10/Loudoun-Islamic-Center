import { describe, expect, it, vi } from "vitest";

import {
  processLead,
  type LeadPipelineBindings,
  type LeadPipelineDependencies,
} from "@/lib/lead-pipeline";
import type { LeadInput } from "@/lib/schema";

const lead: LeadInput = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "+1 555 0100",
  message: "I'd love to hear more about your services.",
  turnstileToken: "tok_123",
};

const site = {
  adminEmail: "admin@example.com",
  name: "Zikra Test",
  z360Enabled: true,
  z360InquiriesUrl: "https://z360.example/inquiries",
};

function createHarness() {
  const events: string[] = [];
  const bindings: LeadPipelineBindings = {
    LEADS_BUCKET: {} as R2Bucket,
    TURNSTILE_SECRET: "turnstile-secret",
    PLUNK_API_KEY: "plunk-key",
    Z360_TOKEN: "z360-token",
  };
  const dependencies: LeadPipelineDependencies = {
    verifyTurnstile: vi.fn(async () => {
      events.push("verify");
      return true;
    }),
    backupLead: vi.fn(async () => {
      events.push("backup");
    }),
    sendViaPlunk: vi.fn(async () => {
      events.push("email");
      return new Response(null, { status: 202 });
    }),
    pushToZ360: vi.fn(async () => {
      events.push("z360");
      return new Response(null, { status: 202 });
    }),
    randomUUID: () => "lead-123",
    now: () => "2026-07-14T00:00:00.000Z",
    logger: {
      error: vi.fn(),
      warn: vi.fn(),
    },
  };

  return { bindings, dependencies, events };
}

describe("processLead", () => {
  it("verifies spam and backs up the lead before downstream delivery", async () => {
    const harness = createHarness();

    await expect(
      processLead(lead, harness.bindings, { site }, harness.dependencies),
    ).resolves.toEqual({ ok: true, id: "lead-123" });

    expect(harness.events).toEqual(["verify", "backup", "email", "z360"]);
  });

  it("stops before storage and downstream delivery when Turnstile fails", async () => {
    const harness = createHarness();
    vi.mocked(harness.dependencies.verifyTurnstile).mockResolvedValue(false);

    await expect(
      processLead(lead, harness.bindings, { site }, harness.dependencies),
    ).rejects.toMatchObject({ failure: "spam" });

    expect(harness.dependencies.backupLead).not.toHaveBeenCalled();
    expect(harness.dependencies.sendViaPlunk).not.toHaveBeenCalled();
    expect(harness.dependencies.pushToZ360).not.toHaveBeenCalled();
  });

  it("treats an R2 failure as fatal and never calls downstream services", async () => {
    const harness = createHarness();
    vi.mocked(harness.dependencies.backupLead).mockRejectedValue(
      new Error("R2 unavailable"),
    );

    await expect(
      processLead(lead, harness.bindings, { site }, harness.dependencies),
    ).rejects.toMatchObject({ failure: "storage" });

    expect(harness.dependencies.sendViaPlunk).not.toHaveBeenCalled();
    expect(harness.dependencies.pushToZ360).not.toHaveBeenCalled();
  });

  it("continues to Z360 when email delivery throws", async () => {
    const harness = createHarness();
    vi.mocked(harness.dependencies.sendViaPlunk).mockRejectedValue(
      new Error("Plunk unavailable"),
    );

    await expect(
      processLead(lead, harness.bindings, { site }, harness.dependencies),
    ).resolves.toEqual({ ok: true, id: "lead-123" });

    expect(harness.dependencies.pushToZ360).toHaveBeenCalledOnce();
    expect(harness.dependencies.logger.error).toHaveBeenCalledOnce();
  });

  it("skips optional Z360 delivery unless both config and token enable it", async () => {
    const harness = createHarness();
    const disabledSite = { ...site, z360Enabled: false };

    await processLead(
      lead,
      harness.bindings,
      { site: disabledSite },
      harness.dependencies,
    );

    expect(harness.dependencies.pushToZ360).not.toHaveBeenCalled();
  });
});
