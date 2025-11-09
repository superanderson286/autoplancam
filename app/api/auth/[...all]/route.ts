// Importa la instancia de 'auth' configurada desde lib/auth.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// Creamos un manejador personalizado para interceptar la petición POST
const handler = toNextJsHandler(auth);

export const POST = async (request: Request) => {
  // Clonamos la petición para poder leer el cuerpo sin consumirlo
  const requestClone = request.clone();
  const url = new URL(request.url);

  // Verificamos si es una petición de inicio de sesión con email
  if (url.pathname.endsWith("/sign-in/email")) {
    const response = await handler.POST(request); // Dejamos que better-auth haga el login

    // Si el inicio de sesión fue exitoso (status 200)
    if (response.status === 200) {
      const { email } = await requestClone.json();
      const foundUser = await db.query.users.findFirst({ where: eq(users.email, email) });

      if (foundUser) {
        // Ejecutamos la actualización del contador aquí
        await db
          .update(users)
          .set({ loginCount: (foundUser.loginCount || 0) + 1 })
          .where(eq(users.id, foundUser.id));
      }
    }
    return response; // Devolvemos la respuesta original de better-auth
  }

  // Para cualquier otra petición POST, usamos el manejador por defecto
  return handler.POST(request);
};

// Exporta los manejadores GET y POST directamente desde la instancia 'auth'.
// Esto asegura que se use nuestra configuración personalizada con los callbacks de rol.
export const { GET } = toNextJsHandler(auth);
