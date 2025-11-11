"use server";

import { z } from "zod";
import { db } from "@/db";
import { trialRequests, users } from "@/db/schema";
import { sendTrialCredentialsEmail, sendTrialRequestEmail } from "@/lib/email";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";

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
  const fullName = `${firstname} ${lastname}`;
  const generatedPassword = generateSimplePassword();

  try {
    // 1. Primero: Registrar la solicitud de prueba en trial_requests
    await db.insert(trialRequests).values({
      firstName: firstname,
      lastName: lastname,
      country,
      email,
      useCase: "Not provided",
      status: "pending",
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
      // 5. Enviar correos
      // Enviar correo de credenciales AL USUARIO con las credenciales incluidas
      await sendTrialCredentialsEmail(email, fullName, email, generatedPassword);

  // Opcional: Enviar correo de notificación AL ADMIN (incluye país)
  await sendTrialRequestEmail(email, fullName, country);
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
      message: "Tu cuenta de prueba ha sido creada con éxito. Recibirás tus credenciales por correo. Si no lo ves en la bandeja de entrada, revisa la carpeta Spam o No Deseados.",
    };
  } catch (error) {
    console.error("Error processing trial request:", error);
    return {
      message: "An unexpected error occurred. Please try again.",
    };
  }
}
