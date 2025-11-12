"use server";

import { z } from "zod";
import { db } from "@/db";
import { trialRequests, users, trialReservations } from "@/db/schema";
import { sendTrialCredentialsEmail, sendTrialRequestEmail } from "@/lib/email";
import { auth } from "@/lib/auth";
import { eq, and, gt } from "drizzle-orm";
import { headers } from 'next/headers';

// Lightweight disposable email domains list (can be expanded or replaced with a service)
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  '10minutemail.com',
  'tempmail.com',
  'trashmail.com',
  'dispostable.com',
  'guerrillamail.com',
]);

function isDisposableEmail(email: string) {
  try {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return false;
    return DISPOSABLE_DOMAINS.has(domain);
  } catch (e) {
    return false;
  }
}

const trialRequestSchema = z.object({
  firstname: z.string().min(1, "First name is required"),
  lastname: z.string().min(1, "Last name is required"),
  country: z.string().min(1, "Country is required"),
  email: z.string().email("Invalid email address"),
});

// Función para generar una contraseña sencilla
function generateSimplePassword(): string {
  const length = 10;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

export async function requestTrial(prevState: any, formData: FormData) {
  const validatedFields = trialRequestSchema.safeParse({
    firstname: formData.get("firstname"),
    lastname: formData.get("lastname"),
    country: formData.get("country"),
    email: formData.get("email"),
  });

  if (!validatedFields.success) {
    return {
      message: "Invalid form data. Please check your entries.",
    };
  }

  const { firstname, lastname, country, email } = validatedFields.data;
  const lang = (formData.get("lang") as string) || 'en';
  const fingerprint = (formData.get("fingerprint") as string) || null;
  const recaptchaToken = (formData.get('recaptchaToken') as string) || null;
  const fullName = `${firstname} ${lastname}`;
  const generatedPassword = generateSimplePassword();

  const hdrs = await headers();
  const userAgent = hdrs.get('user-agent') ?? 'unknown';
  const ipHeader = hdrs.get('x-forwarded-for') || hdrs.get('x-real-ip') || '';
  const ip = ipHeader ? ipHeader.split(',')[0].trim() : 'unknown';

  let trialRequestId: number | undefined;

  try {
    // Step 1: Create a single, trackable trial request record.
    const newRequest = await db.insert(trialRequests).values({
      firstName: firstname,
      lastName: lastname,
      country,
      email,
      useCase: "Not provided",
      status: "pending",
      ip,
      userAgent,
      fingerprint,
    }).returning({ id: trialRequests.id });

    if (!newRequest || newRequest.length === 0 || !newRequest[0].id) {
        console.error("Failed to create a trackable trial request.");
        return { message: "An unexpected error occurred. Please try again later." };
    }
    trialRequestId = newRequest[0].id;

    // Step 2: Perform sequential anti-abuse checks.
    // If a check fails, update the record and return.

    // Check 2.1: Disposable email
    if (isDisposableEmail(email)) {
      await db.update(trialRequests).set({ status: 'blocked', note: 'disposable_email' }).where(eq(trialRequests.id, trialRequestId));
      return { message: 'Disposable email addresses are not allowed. Please use a real email.' };
    }

    // Check 2.2: Email already has a processed trial
    const existingByEmail = await db.query.trialRequests.findFirst({
      where: and(eq(trialRequests.email, email), eq(trialRequests.status, 'processed'))
    });
    if (existingByEmail) {
      await db.update(trialRequests).set({ status: 'blocked', note: 'email_already_used' }).where(eq(trialRequests.id, trialRequestId));
      return { message: 'An account with this email already exists.' };
    }

    // Check 2.3: Fingerprint already used for a processed trial
    if (fingerprint) {
      const existingByFp = await db.query.trialRequests.findFirst({
        where: and(
          eq(trialRequests.fingerprint, fingerprint),
          eq(trialRequests.status, 'processed')
        )
      });
      if (existingByFp) {
        await db.update(trialRequests).set({ status: 'blocked', note: 'fingerprint_already_used_for_processed_trial' }).where(eq(trialRequests.id, trialRequestId));
        return { message: 'This device has already been used to claim a trial.' };
      }
    }

    // Check 2.4: Rate limit by IP (only in production)
    if (process.env.NODE_ENV !== 'development') {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentFromIp = await db.query.trialRequests.findMany({ where: and(eq(trialRequests.ip, ip), gt(trialRequests.createdAt, since)) });
      if (recentFromIp.length >= 3) {
        const recaptchaSecret = process.env.RECAPTCHA_SECRET;
        let captchaOk = false;
        if (recaptchaSecret && recaptchaToken) {
          try {
            const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: `secret=${encodeURIComponent(recaptchaSecret)}&response=${encodeURIComponent(recaptchaToken)}&remoteip=${encodeURIComponent(ip)}`,
            });
            const verifyJson = await verifyRes.json();
            if (verifyJson.success && (typeof verifyJson.score === 'undefined' || verifyJson.score >= 0.5)) {
              captchaOk = true;
              await db.update(trialRequests).set({ note: 'captcha_passed' }).where(eq(trialRequests.id, trialRequestId));
            }
          } catch (e) { console.error('reCAPTCHA verify error', e); }
        }

        if (!captchaOk) {
          await db.update(trialRequests).set({ status: 'blocked', note: 'ip_rate_limit' }).where(eq(trialRequests.id, trialRequestId));
          return { message: 'Too many requests from your network. Please complete the CAPTCHA to continue.' };
        }
      }
    }

    // Step 3: Reserve email and create user
    try {
      await db.insert(trialReservations).values({ email });
    } catch (reserveErr: any) {
      await db.update(trialRequests).set({ status: 'blocked', note: 'reservation_failed' }).where(eq(trialRequests.id, trialRequestId));
      return { message: 'A trial for this email is already being processed. If this is an error, please try again later.' };
    }

    const existingUser = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existingUser) {
      await db.update(trialRequests).set({ status: 'blocked', note: 'email_already_exists' }).where(eq(trialRequests.id, trialRequestId));
      await db.delete(trialReservations).where(eq(trialReservations.email, email));
      return { message: 'An account with this email already exists.' };
    }

    let newUserResponse;
    try {
      newUserResponse = await auth.api.createUser({
        body: {
          email,
          password: generatedPassword,
          name: fullName,
          role: "user",
        }
      });
    } catch (createUserError: any) {
      console.error("Error creating user with auth:", createUserError);
      await db.delete(trialReservations).where(eq(trialReservations.email, email));
      if (createUserError.message?.includes("email") || createUserError.message?.includes("already")) {
        await db.update(trialRequests).set({ status: 'blocked', note: 'auth_create_duplicate' }).where(eq(trialRequests.id, trialRequestId));
        return { message: 'An account with this email already exists.' };
      }
      throw createUserError;
    }

    const newUserId = newUserResponse.user.id;

    // Step 4: Provision trial and send emails
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3);

    await db.update(users).set({
      reportsLimit: 5,
      reportsUsed: 0,
      expiresAt: expiresAt,
      emailVerified: true,
    }).where(eq(users.id, newUserId));

    await db.update(trialRequests).set({ status: "processed" }).where(eq(trialRequests.id, trialRequestId));

    try {
      await sendTrialCredentialsEmail(email, fullName, email, generatedPassword, lang);
      await sendTrialRequestEmail(email, fullName, country, lang);
    } catch (emailError: any) {
      console.error("An email failed to send:", emailError);
      await db.update(trialRequests).set({ note: `processed_email_failed: ${String(emailError.message || emailError)}` }).where(eq(trialRequests.id, trialRequestId));
      await db.delete(trialReservations).where(eq(trialReservations.email, email));
      return {
        success: true,
        message: "Your trial account has been created, but there was an issue sending your credentials email. Please contact support.",
      };
    }

    // Step 5: Cleanup and return success
    await db.delete(trialReservations).where(eq(trialReservations.email, email));

    return {
      success: true,
      message: "trial_success_check_spam",
    };

  } catch (error: any) {
    console.error("Error processing trial request:", error);
    if (trialRequestId) {
        try {
            await db.update(trialRequests).set({ status: 'failed', note: String(error.message || error) }).where(eq(trialRequests.id, trialRequestId));
        } catch (dbError) {
            console.error("Failed to update trial request with error state:", dbError);
        }
    }
    return {
      message: "An unexpected error occurred. Please try again.",
    };
  }
}
