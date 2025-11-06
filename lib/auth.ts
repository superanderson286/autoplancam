// auth.ts

import { betterAuth, Session, User } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db, pool } from '../db/index.js';
import * as schema from '../db/schema.js';
import { v4 as uuidv4 } from 'uuid';

// Creamos la instancia del adaptador y la exportamos para poder usarla en otros scripts.
export const adapter = drizzleAdapter(db, {
  provider: 'pg',
  // CAMBIO CLAVE: Pasamos el objeto de esquema filtrado y nombrado correctamente
  schema: { // Mapeamos explícitamente los nombres que better-auth espera
    user: schema.users,
    session: schema.sessions,
    account: schema.accounts,
    verificationToken: schema.verification,
  },
});

export const auth = betterAuth({
  secret: process.env.AUTH_SECRET!,

  baseURL: process.env.NEXT_PUBLIC_APP_URL!,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    //domain: process.env.NODE_ENV === 'production' ? 'autoplancam.vercel.app' : undefined,
  },
  database: adapter, // Pasamos la instancia del adaptador a betterAuth

  emailAndPassword: {
    enabled: true,

    async sendResetPassword(data, request) {
      // Implementa aquí el envío de correo de recuperación
    },

    hooks: {},
  },

  socialProviders: {
    // google: {
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    // }
  },
  pages: {
    signIn: "/auth/sign-in",
  },
  callbacks: {
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // Si el sistema no pasa una URL específica (es decir, cae al default), 
      // lo enviamos a /planner. De lo contrario, respeta la URL solicitada.
      if (url === baseUrl || url === baseUrl + '/') {
          return '/planner';
      }
      // Si es una URL completa que comienza con la base (seguro), o si es una ruta relativa.
      return url.startsWith(baseUrl) || url.startsWith('/') ? url : baseUrl;
    },
    async session({ session, user }: { session: any; user: any }) {
      if (user) {
        session.user.role = user.role;
      }
      return session;
    },

  },
});