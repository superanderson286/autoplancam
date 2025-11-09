// auth.ts
//import betterAuth from 'better-auth';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import {
  users as user,
  sessions as session,
  accounts as account,
  verification
} from '../db/schema';
import { v4 as uuidv4 } from 'uuid';
import { admin } from 'better-auth/plugins/admin';

// Derivamos el tipo del usuario directamente desde el esquema de Drizzle.
type DbUser = typeof user.$inferSelect;

const authSchema = {
  user,
  session,
  account,
  verificationToken: verification,
};

export const auth = betterAuth({
  secret: process.env.AUTH_SECRET!,
  baseURL: process.env.NEXT_PUBLIC_APP_URL!,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    // domain: process.env.NODE_ENV === 'production' ? 'autoplancam.vercel.app' : undefined,
  },
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: authSchema,
  }),
  
  // 👇 ESTE ES EL CAMBIO CLAVE
  // Mapeamos el campo 'role' de la base de datos al objeto de usuario de la sesión.
  mapAdapterUser: (user: DbUser) => {
    // 'user' es el usuario que viene de la base de datos
    return { ...user, role: user.role };
  },

  emailAndPassword: {
    enabled: true,
    async sendResetPassword(data: any, request: any) {
      // Implementa aquí el envío de correo de recuperación
    },
    // 👇 ESTA ES LA SOLUCIÓN BASADA EN TU INFORMACIÓN
    // Se ejecuta al iniciar sesión con email y contraseña.
    async authorize(credentials: any) {
      // Busca al usuario en la base de datos por su email.
      // La tabla en la base de datos es 'user', pero el objeto de esquema de Drizzle se llama 'users'.
      // Por lo tanto, la consulta correcta es 'db.query.users'.
      const user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, credentials.email as string),
      });

      // Si se encuentra el usuario, devuelve sus datos, incluido el rol.
      // better-auth se encargará de la validación de la contraseña.
      if (user) {
        return user; // Devolvemos el objeto de usuario completo de la BD.
      }

      // Si no se encuentra el usuario, devuelve null para denegar el acceso.
      return null;
    },
    // Para desactivar el registro, se usa 'disableSignUp'
    disableSignUp: true,
  },

  socialProviders: {
    // google: {
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    // }
  },

  pages: {
    signIn: "/auth/sign-in",
    // signUp eliminado
  },

  // La estrategia de sesión se define en el nivel superior de la configuración
  strategy: "jwt",
  plugins: [admin()],

  callbacks: {
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      if (url === baseUrl || url === baseUrl + '/') {
        return '/planner';
      }
      return url.startsWith(baseUrl) || url.startsWith('/') ? url : baseUrl;
    },

    // 1. Este callback añade el rol al token JWT al iniciar sesión.
    async jwt({ token, user }: { token: any; user: any }) {
      // El objeto 'user' solo está disponible en el primer inicio de sesión.
      if (user) {
        token.role = user.role;
      }
      return token;
    },

    // 2. Este callback toma el rol del token y lo añade a la sesión del cliente.
    async session({ session, user }: { session: any; user: any }) {
      // El objeto 'user' en este callback puede no ser el completo.
      // Es más seguro y robusto asignar el rol desde el 'token',
      // que ya hemos enriquecido en el callback 'jwt'.
      // @ts-ignore
      session.user.role = user.role;
      return session;
    },
  },
});