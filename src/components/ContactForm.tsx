import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { actions } from "astro:actions";
import { toast } from "sonner";

import { leadSchema, type LeadInput } from "@/lib/schema";
import { TURNSTILE_SITE_KEY } from "@/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Toaster } from "@/components/ui/sonner";

const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js";

interface TurnstileApi {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
    },
  ) => string;
  reset: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/**
 * Inject the Turnstile script once (idempotent across islands / re-mounts).
 */
function loadTurnstileScript(): void {
  if (document.querySelector(`script[src="${TURNSTILE_SCRIPT_SRC}"]`)) return;
  const script = document.createElement("script");
  script.src = TURNSTILE_SCRIPT_SRC;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [token, setToken] = useState("");
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const form = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
      turnstileToken: "",
    },
  });

  const setTurnstileToken = (value: string) => {
    setToken(value);
    form.setValue("turnstileToken", value, { shouldValidate: true });
  };

  const resetTurnstile = () => {
    setTurnstileToken("");
    window.turnstile?.reset(widgetIdRef.current ?? undefined);
  };

  useEffect(() => {
    loadTurnstileScript();

    let cancelled = false;
    const renderWidget = () => {
      if (cancelled || !window.turnstile || !widgetContainerRef.current) return;
      if (widgetIdRef.current !== null) return;
      widgetIdRef.current = window.turnstile.render(
        widgetContainerRef.current,
        {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (t) => setTurnstileToken(t),
          "error-callback": () => setTurnstileToken(""),
          "expired-callback": () => setTurnstileToken(""),
        },
      );
    };

    // The script loads async; poll briefly until window.turnstile is ready.
    const interval = window.setInterval(() => {
      if (window.turnstile) {
        renderWidget();
        window.clearInterval(interval);
      }
    }, 100);
    renderWidget();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const onSubmit = async (values: LeadInput) => {
    const { data, error } = await actions.submitLead(values);
    if (error || !data?.ok) {
      toast.error(error?.message ?? "Something went wrong. Please try again.");
      resetTurnstile();
      return;
    }
    toast.success("Thanks — we'll be in touch shortly.");
    resetTurnstile();
    setSubmitted(true);
  };

  const submitting = form.formState.isSubmitting;

  return (
    <>
      {/* Mounted here so the reusable form island is self-contained; sonner's
          toast() dispatches to any mounted Toaster, and this one persists
          across the form → thank-you state change. */}
      <Toaster richColors position="top-center" />
      {submitted ? (
        <div
          role="status"
          className="border-input rounded-lg border p-6 text-center"
        >
          <h2 className="text-lg font-semibold">Message sent</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Thanks for reaching out. We&apos;ve received your message and will
            get back to you soon.
          </p>
        </div>
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-6"
            noValidate
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Phone{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input type="tel" autoComplete="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea rows={5} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div ref={widgetContainerRef} />

            <Button type="submit" disabled={submitting || !token}>
              {submitting ? "Sending…" : "Send message"}
            </Button>
          </form>
        </Form>
      )}
    </>
  );
}
