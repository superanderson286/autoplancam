"use server";

import { z } from "zod";
import { db } from "@/db";
import { trialRequests, users } from "@/db/schema";
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
  // idioma enviado desde el cliente (hidden input)
  const lang = (formData.get("lang") as string) || 'en';
  const fingerprint = (formData.get("fingerprint") as string) || null;
  const recaptchaToken = (formData.get('recaptchaToken') as string) || null;
  const fullName = `${firstname} ${lastname}`;
  const generatedPassword = generateSimplePassword();

  // extract headers for ip and user-agent
  const hdrs = await headers();
  const userAgent = hdrs.get('user-agent') ?? 'unknown';
  const ipHeader = hdrs.get('x-forwarded-for') || hdrs.get('x-real-ip') || '';
  const ip = ipHeader ? ipHeader.split(',')[0].trim() : 'unknown';

  try {
    // PRE-CHECKS: disposable email, email/fingerprint/ip limits
    // Disposable email check
    if (isDisposableEmail(email)) {
      await db.insert(trialRequests).values({ firstName: firstname, lastName: lastname, country, email, useCase: 'Not provided', status: 'blocked', ip, userAgent, fingerprint, note: 'disposable_email' });
      return { message: 'Disposable email addresses are not allowed. Please use a real email.' };
    }

    // PRE-CHECKS: email/fingerprint/ip limits
    // 1) Email already processed?
    const existingByEmail = await db.query.trialRequests.findFirst({ where: eq(trialRequests.email, email) });
    if (existingByEmail && existingByEmail.status === 'processed') {
      // log blocked attempt
      await db.insert(trialRequests).values({ firstName: firstname, lastName: lastname, country, email, useCase: 'Not provided', status: 'blocked', ip, userAgent, fingerprint, note: 'email_already_used' });
      return { message: 'An account with this email already exists.' };
    }

    // 2) Fingerprint already used?
    if (fingerprint) {
      const existingByFp = await db.query.trialRequests.findFirst({ where: eq(trialRequests.fingerprint, fingerprint) });
      if (existingByFp) {
        await db.insert(trialRequests).values({ firstName: firstname, lastName: lastname, country, email, useCase: 'Not provided', status: 'blocked', ip, userAgent, fingerprint, note: 'fingerprint_used' });
        return { message: 'This device appears to have already requested a trial.' };
      }
    }

    // 3) Rate limit by IP in the last 24 hours (DB-based)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentFromIp = await db.query.trialRequests.findMany({ where: and(eq(trialRequests.ip, ip), gt(trialRequests.createdAt, since)) });
    if (recentFromIp.length >= 3) {
      // if reCAPTCHA secret is configured, try to verify the token and allow if valid
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
          // For v3, check score threshold; for v2, success boolean is enough
          if (verifyJson.success && (typeof verifyJson.score === 'undefined' || verifyJson.score >= 0.5)) {
            captchaOk = true;
          }
        } catch (e) {
          console.error('reCAPTCHA verify error', e);
        }
      }

      if (!captchaOk) {
        await db.insert(trialRequests).values({ firstName: firstname, lastName: lastname, country, email, useCase: 'Not provided', status: 'blocked', ip, userAgent, fingerprint, note: 'ip_rate_limit' });
        return { message: 'Too many requests from your network. Please complete the CAPTCHA to continue.' };
      }
      // otherwise continue; log that captcha was accepted
      await db.insert(trialRequests).values({ firstName: firstname, lastName: lastname, country, email, useCase: 'Not provided', status: 'pending', ip, userAgent, fingerprint, note: 'captcha_passed' });
    } else {
      // 4) Log initial pending attempt (normal path)
      await db.insert(trialRequests).values({
        firstName: firstname,
        lastName: lastname,
        country,
        email,
        useCase: "Not provided",
        status: "pending",
        ip,
        userAgent,
        fingerprint,
      });
    }

    // 4) Log initial pending attempt
    await db.insert(trialRequests).values({
      firstName: firstname,
      lastName: lastname,
      country,
      email,
      useCase: "Not provided",
      status: "pending",
      ip,
      userAgent,
      fingerprint,
    });

    // 2. Segundo: Crear el usuario usando auth.api.createUser (compatible con better-auth)
    // Esto también valida que el email no exista
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
      
      // Verificar si es un error de usuario duplicado
      if (createUserError.message?.includes("email") || createUserError.message?.includes("already")) {
        return {
          message: "An account with this email already exists.",
        };
      }
      
      throw createUserError;
    }

    const newUserId = newUserResponse.user.id;

    // 3. Tercero: Calcular la fecha de expiración (3 días desde ahora)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3);

    // Actualizar los campos de prueba en la base de datos
    await db.update(users).set({
      reportsLimit: 5, // Límite de 5 reportes
      reportsUsed: 0,
      expiresAt: expiresAt, // Expira en 3 días
      emailVerified: true, // Usuario de prueba verificado automáticamente
    }).where(eq(users.id, newUserId));

    // 4. Marcar la solicitud de prueba como "processed"
    await db.update(trialRequests).set({
      status: "processed",
    }).where(eq(trialRequests.email, email));

    try {
    // 5. Enviar correos (localizados según lang)
    // Enviar correo de credenciales AL USUARIO con las credenciales incluidas
    await sendTrialCredentialsEmail(email, fullName, email, generatedPassword, lang);

    // Opcional: Enviar correo de notificación AL ADMIN (incluye país)
    await sendTrialRequestEmail(email, fullName, country, lang);
    } catch (emailError) {
      console.error("An email failed to send:", emailError);
      // El usuario ya fue creado, pero notificamos del error en el correo
      return {
        success: true,
        message: "Your trial account has been created, but there was an issue sending your credentials email. Please contact support.",
      };
    }

    return {
      success: true,
      // devolvemos la clave de traducción; el cliente la mostrará usando i18n
      message: "trial_success_check_spam",
    };
  } catch (error) {
    console.error("Error processing trial request:", error);
    return {
      message: "An unexpected error occurred. Please try again.",
    };
  }
}
