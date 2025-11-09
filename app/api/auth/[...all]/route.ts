// Importa la instancia de 'auth' configurada desde lib/auth.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Exporta los manejadores GET y POST directamente desde la instancia 'auth'.
// Esto asegura que se use nuestra configuración personalizada con los callbacks de rol.
export const { GET, POST } = toNextJsHandler(auth);
