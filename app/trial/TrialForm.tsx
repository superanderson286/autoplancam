"use client";

import React, { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { requestTrial } from "./actions";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";

const initialState = {
  message: "",
  success: false,
};

function SubmitButton({ onClick, type = 'submit' }: { onClick?: React.MouseEventHandler<HTMLButtonElement>, type?: 'button' | 'submit' }) {
  const { pending } = useFormStatus();
  const { t, i18n } = useTranslation();

  return (
    <button
      onClick={onClick}
      className="submit-button group/btn relative block h-10 w-full rounded-md bg-gradient-to-br from-black to-neutral-600 font-medium text-white shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] dark:bg-zinc-800 dark:from-zinc-900 dark:to-zinc-900 dark:shadow-[0px_1px_0px_0px_#27272a_inset,0px_-1px_0px_0px_#27272a_inset] disabled:opacity-50"
      type={type}
      disabled={pending}
    >
      {pending ? t("Submitting...") : `${t("Request Trial")} →`}
      <SubmitButtonHighlight />
    </button>
  );
}

export function TrialForm() {
  const [state, formAction] = useActionState(requestTrial, initialState);
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [fingerprint, setFingerprint] = useState<string>("");
  const [blockedByLocalFlag, setBlockedByLocalFlag] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [submittingWithCaptcha, setSubmittingWithCaptcha] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const recaptchaInputRef = useRef<HTMLInputElement | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // Initialize FingerprintJS and localStorage flag check
  useEffect(() => {
    // Check localStorage flag
    try {
      const used = localStorage.getItem('hasUsedTrial');
      if (used) setBlockedByLocalFlag(true);
    } catch (e) {
      // ignore
    }

    let mounted = true;
  (async () => {
      try {
        const FingerprintJS = (await import('@fingerprintjs/fingerprintjs')).default;
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        if (!mounted) return;
        setFingerprint(result.visitorId);
      } catch (e) {
        // if fingerprint lib fails, we just continue without it
        console.error('Fingerprint init failed', e);
      }
    })();

    return () => { mounted = false; };
  }, []);

  // Load reCAPTCHA script if site key provided
  useEffect(() => {
    if (!siteKey) return;
    const id = 'recaptcha-script';
    if (document.getElementById(id)) return;
    const s = document.createElement('script');
    s.id = id;
    s.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }, [siteKey]);

  // Click handler to get token from reCAPTCHA v3 before submitting (avoids double onSubmit recursion)
  const handleClick = async (e?: React.MouseEvent) => {
    if (!siteKey) {
      // no captcha configured, just submit
      formRef.current?.submit();
      return;
    }
    if (submittingWithCaptcha) return;
    setSubmittingWithCaptcha(true);
    try {
      // prefer grecaptcha.ready when available
      const grecaptcha = (window as any).grecaptcha;
      if (!grecaptcha) throw new Error('grecaptcha not available');

      // wait for ready
      await new Promise<void>((res, rej) => {
        try {
          grecaptcha.ready(() => res());
          // timeout
          setTimeout(() => rej(new Error('grecaptcha.ready timeout')), 10000);
        } catch (err) {
          rej(err);
        }
      });

      const token = await grecaptcha.execute(siteKey, { action: 'trial_request' });
      setRecaptchaToken(token);
      if (recaptchaInputRef.current) recaptchaInputRef.current.value = token;
      // submit the form programmatically
      formRef.current?.submit();
    } catch (err) {
      console.error('reCAPTCHA failed', err);
      // fallback: submit without token
      formRef.current?.submit();
    } finally {
      setSubmittingWithCaptcha(false);
    }
  };

  // When action reports success, set local flag so this browser won't request again casually
  useEffect(() => {
    if (state.success) {
      try { localStorage.setItem('hasUsedTrial', '1'); } catch (e) {}
    }
  }, [state.success]);

  if (state.success) {
    return (
      <div className="shadow-input mx-auto w-full max-w-md rounded-none bg-white p-4 md:rounded-2xl md:p-8 dark:bg-black">
        <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
          {t("Request Received!")}
        </h2>
        <p className="mt-2 max-w-sm text-sm text-neutral-600 dark:text-neutral-300">
          {state.message ? t(state.message) : t("Thank you for your interest. You will receive an email with your trial credentials shortly.")}
        </p>

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => router.push('/')}
            className="rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
          >
            {t("OK")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="shadow-input mx-auto w-full max-w-md rounded-none bg-white p-4 md:rounded-2xl md:p-8 dark:bg-black">
      <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
        {t("Request a Free Trial")}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-neutral-600 dark:text-neutral-300">
        {t("Enter your details to get started.")}
      </p>

      {/* Privacy / fingerprinting notice */}
      <p className="mt-3 max-w-sm text-xs text-neutral-500 dark:text-neutral-400">
        {t("trial.fingerprint_notice", { defaultValue: "We collect basic device identifiers to prevent abuse. See our " })}
        <a className="underline ml-1 text-sky-600" href="/privacy">
          {t("Privacy Policy")}
        </a>
      </p>

      {state.message && !state.success && (
        <div className="mt-4 rounded-md border border-red-500 bg-red-50 p-3 text-center text-sm text-red-600">
          {state.message}
        </div>
      )}

      {blockedByLocalFlag ? (
        <div className="mt-6 rounded-md border border-yellow-400 bg-yellow-50 p-4 text-sm text-yellow-800">
          {t("It seems this browser already requested a trial. If this is an error, clear your site data or contact support.")}
        </div>
      ) : (
        <form ref={formRef} className="my-8 flex flex-col gap-6" action={formAction}>
        <div className="flex flex-col gap-4 md:flex-row">
          <InputGroup>
            <Label htmlFor="firstName">{t("First Name")}</Label>
                <Input
                  id="firstName"
                  name="firstname"
                  placeholder={t("placeholder.firstName")}
                  type="text"
                  required
                />
          </InputGroup>
          <InputGroup>
            <Label htmlFor="lastName">{t("Last Name")}</Label>
            <Input
              id="lastName"
              name="lastname"
              placeholder={t("placeholder.lastName")}
              type="text"
              required
            />
          </InputGroup>
        </div>
        <InputGroup>
          <Label htmlFor="email">{t("Email Address")}</Label>
          <Input
            id="email"
            name="email"
            placeholder={t("placeholder.email")}
            type="email"
            required
          />
        </InputGroup>
        <InputGroup>
          <Label htmlFor="country">{t("Country")}</Label>
          <Input
            id="country"
            name="country"
            placeholder={t("placeholder.country")}
            type="text"
            required
          />

          {/* Hidden fields to send language, fingerprint and recaptcha token to server */}
          <input type="hidden" name="lang" value={i18n?.language || 'en'} />
          <input type="hidden" name="fingerprint" value={fingerprint} />
          <input ref={recaptchaInputRef} type="hidden" name="recaptchaToken" value={recaptchaToken} />
        </InputGroup>
          <SubmitButton type="button" onClick={handleClick} />
        </form>
      )}
    </div>
  );
}

const SubmitButtonHighlight = () => {
  return (
    <>
      <span className="absolute -bottom-px left-0 right-0 h-px w-full bg-gradient-to-r from-transparent via-sky-500 to-transparent opacity-0 transition-opacity duration-500 group-hover/btn:opacity-100" />
      <span className="absolute -bottom-px mx-auto h-px w-1/2 bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-0 blur-sm transition-opacity duration-500 group-hover/btn:opacity-100" />
    </>
  );
};

const InputGroup = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      {children}
    </div>
  );
};