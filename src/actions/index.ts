import { defineAction, ActionError } from "astro:actions";
import { env } from "cloudflare:workers";

import { SITE } from "@/config";
import { LeadPipelineError, processLead } from "@/lib/lead-pipeline";
import { leadSchema } from "@/lib/schema";

export const server = {
  submitLead: defineAction({
    accept: "json",
    input: leadSchema,
    handler: async (input, context) => {
      try {
        return await processLead(input, env, {
          clientAddress: context.clientAddress,
          site: SITE,
        });
      } catch (error) {
        if (error instanceof LeadPipelineError && error.failure === "spam") {
          throw new ActionError({
            code: "FORBIDDEN",
            message: "Spam check failed. Please try again.",
          });
        }

        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "We couldn't save your message. Please try again.",
        });
      }
    },
  }),
};
