"use client";

import React, { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { requestTrial } from "./actions";
import { useTranslation } from "react-i18next";

const initialState = {
  message: "",
  success: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useTranslation();

  return (
    <button
      className="submit-button group/btn relative block h-10 w-full rounded-md bg-gradient-to-br from-black to-neutral-600 font-medium text-white shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] dark:bg-zinc-800 dark:from-zinc-900 dark:to-zinc-900 dark:shadow-[0px_1px_0px_0px_#27272a_inset,0px_-1px_0px_0px_#27272a_inset] disabled:opacity-50"
      type="submit"
      disabled={pending}
    >
      {pending ? t("Submitting...") : `${t("Request Trial")} →`}
      <SubmitButtonHighlight />
    </button>
  );
}

export function TrialForm() {
  const [state, formAction] = useActionState(requestTrial, initialState);
  const { t } = useTranslation();

  if (state.success) {
    return (
      <div className="shadow-input mx-auto w-full max-w-md rounded-none bg-white p-4 md:rounded-2xl md:p-8 dark:bg-black">
        <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
          {t("Request Received!")}
        </h2>
        <p className="mt-2 max-w-sm text-sm text-neutral-600 dark:text-neutral-300">
          {t(
            "Thank you for your interest. You will receive an email with your trial credentials shortly."
          )}
        </p>
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

      {state.message && !state.success && (
        <div className="mt-4 rounded-md border border-red-500 bg-red-50 p-3 text-center text-sm text-red-600">
          {state.message}
        </div>
      )}

      <form className="my-8 flex flex-col gap-6" action={formAction}>
        <div className="flex flex-col gap-4 md:flex-row">
          <InputGroup>
            <Label htmlFor="firstName">{t("First Name")}</Label>
            <Input
              id="firstName"
              name="firstname"
              placeholder="Tyler"
              type="text"
              required
            />
          </InputGroup>
          <InputGroup>
            <Label htmlFor="lastName">{t("Last Name")}</Label>
            <Input
              id="lastName"
              name="lastname"
              placeholder="Durden"
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
            placeholder="projectmayhem@fc.com"
            type="email"
            required
          />
        </InputGroup>
        <InputGroup>
          <Label htmlFor="country">{t("Country")}</Label>
          <Input
            id="country"
            name="country"
            placeholder="Your Country"
            type="text"
            required
          />
        </InputGroup>

        <SubmitButton />
      </form>
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