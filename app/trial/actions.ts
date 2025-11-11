"use server";

import { z } from "zod";
import { db } from "@/db";
import { trialRequests } from "@/db/schema";
import { sendTrialCredentialsEmail, sendTrialRequestEmail } from "@/lib/email";

const trialRequestSchema = z.object({
  firstname: z.string().min(1, "First name is required"),
  lastname: z.string().min(1, "Last name is required"),
  country: z.string().min(1, "Country is required"),
  email: z.string().email("Invalid email address"),
});

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

  try {
    await db.insert(trialRequests).values({
      firstName: firstname,
      lastName: lastname,
      country,
      email,
      useCase: "Not provided", // Añadir un valor por defecto para el campo requerido
    });

    try {
      // Enviar correo de credenciales AL USUARIO
      await sendTrialCredentialsEmail(email, `${firstname} ${lastname}`);

      // Opcional: Enviar correo de notificación AL ADMIN
      await sendTrialRequestEmail(email, `${firstname} ${lastname}`);
    } catch (emailError) {
      console.error("An email failed to send:", emailError);
      // Opcional: podrías devolver un mensaje de éxito parcial si el correo falla.
    }

    return {
      success: true,
      message: "Your trial request has been submitted successfully. You will receive your credentials in your email shortly.",
    };
  } catch (error) {
    console.error("Error processing trial request:", error);
    return {
      message: "An unexpected error occurred. Please try again.",
    };
  }
}
