import { describe, it, expect } from "vitest";

import { leadSchema, type LeadInput } from "@/lib/schema";
import { buildPlunkPayload } from "@/lib/plunk";
import { buildLeadRecord } from "@/lib/r2";
import { buildZ360Payload } from "@/lib/z360";

const validLead: LeadInput = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "+1 555 0100",
  message: "I'd love to hear more about your services.",
  turnstileToken: "tok_123",
};

describe("leadSchema", () => {
  it("accepts a valid lead", () => {
    const result = leadSchema.safeParse(validLead);
    expect(result.success).toBe(true);
  });

  it("rejects a bad email", () => {
    const result = leadSchema.safeParse({
      ...validLead,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a too-short message", () => {
    const result = leadSchema.safeParse({ ...validLead, message: "hi" });
    expect(result.success).toBe(false);
  });
});

describe("buildPlunkPayload", () => {
  it("sends to the admin email and puts the name in the subject", () => {
    const payload = buildPlunkPayload(validLead, {
      adminEmail: "admin@example.com",
      siteName: "Zikra Test",
    });
    expect(payload.to).toBe("admin@example.com");
    expect(payload.subject).toContain(validLead.name);
    expect(payload.subscribed).toBe(false);
  });

  it("escapes user-controlled HTML in the email body", () => {
    const payload = buildPlunkPayload(
      {
        ...validLead,
        name: "<script>alert(1)</script>",
        message: "Hello <strong>team</strong> & thanks",
      },
      {
        adminEmail: "admin@example.com",
        siteName: "Zikra <Test>",
      },
    );
    expect(payload.body).toContain("Zikra &lt;Test&gt;");
    expect(payload.body).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(payload.body).toContain(
      "Hello &lt;strong&gt;team&lt;/strong&gt; &amp; thanks",
    );
    expect(payload.body).not.toContain("<script>");
  });
});

describe("buildLeadRecord", () => {
  it("omits turnstileToken and includes id, receivedAt and email", () => {
    const record = buildLeadRecord(validLead, {
      id: "abc-123",
      receivedAt: "2026-07-01T00:00:00.000Z",
      source: "website",
    });
    expect(record).not.toHaveProperty("turnstileToken");
    expect(record.id).toBe("abc-123");
    expect(record.receivedAt).toBe("2026-07-01T00:00:00.000Z");
    expect(record.email).toBe(validLead.email);
  });
});

describe("buildZ360Payload", () => {
  it('sets source to "website"', () => {
    const payload = buildZ360Payload(validLead);
    expect(payload.source).toBe("website");
    expect(payload.email).toBe(validLead.email);
  });
});
