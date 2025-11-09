"use client";

import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function SignInForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // La estructura correcta es authClient.signIn.credentials
      const result = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/planner", // La propiedad correcta es callbackURL
      });
      if (result?.error) {
        setError(t("Invalid credentials. Please try again."));
        setLoading(false);
      }
    } catch (err) {
      setError(t("An unexpected error occurred."));
      setLoading(false);
    }
  };

  // const handleSocialSignIn = async (provider: "github" | "google") => {
  //   setLoading(true);
  //   setError(null);
  //   // Llama al método 'social' del objeto signIn, pasando el proveedor dentro
  //   // y usando las propiedades correctas: `callbackURL` y `disableRedirect`.
  //   await signIn.social({
  //     provider,
  //     callbackURL: "/planner",
  //   });
  // };

  return (
    <div className="shadow-input mx-auto w-full max-w-md rounded-none bg-white p-4 md:rounded-2xl md:p-8 dark:bg-black">
      <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
        {t("Welcome Back")}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-neutral-600 dark:text-neutral-300">
        {t("Enter your credentials to access your account")}
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-red-500 bg-red-50 p-3 text-center text-sm text-red-600">
          {error}
        </div>
      )}

      <form className="my-8 flex flex-col gap-6" onSubmit={handleSubmit}>
        <InputGroup>
          <Label htmlFor="email">{t("Email Address")}</Label>
          <Input
            id="email"
            placeholder="projectmayhem@fc.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </InputGroup>
        <InputGroup>
          <Label htmlFor="password">{t("Password")}</Label>
          <Input
            id="password"
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </InputGroup>

        <button
          className="submit-button group/btn relative block h-10 w-full rounded-md bg-gradient-to-br from-black to-neutral-600 font-medium text-white shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] dark:bg-zinc-800 dark:from-zinc-900 dark:to-zinc-900 dark:shadow-[0px_1px_0px_0px_#27272a_inset,0px_-1px_0px_0px_#27272a_inset] disabled:opacity-50"
          type="submit"
          disabled={loading}
        >
          {loading ? t("Signing in...") : `${t("Sign In")} →`}
          <SubmitButtonHighlight />
        </button>

        {/* <div className="my-8 h-[1px] w-full bg-gradient-to-r from-transparent via-neutral-300 to-transparent dark:via-neutral-700" />

        <div className="flex flex-col space-y-4">
          <button
            className="group/btn shadow-input relative flex h-10 w-full items-center justify-start space-x-2 rounded-md bg-gray-50 px-4 font-medium text-black dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626] disabled:opacity-50"
            type="button"
            disabled={loading}
            onClick={() => handleSocialSignIn && handleSocialSignIn("github")}
          >
            <IconBrandGithub className="h-4 w-4 text-neutral-800 dark:text-neutral-300" />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              GitHub
            </span>
            <BottomGradient />
          </button> 
          <button
            className="group/btn shadow-input relative flex h-10 w-full items-center justify-start space-x-2 rounded-md bg-gray-50 px-4 font-medium text-black dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626] disabled:opacity-50"
            type="button"
            disabled={loading}
            onClick={() => handleSocialSignIn && handleSocialSignIn("google")}
          >
            <IconBrandGoogle className="h-4 w-4 text-neutral-800 dark:text-neutral-300" />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              Google
            </span>
            <BottomGradient />
          </button> 
        </div> */}
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