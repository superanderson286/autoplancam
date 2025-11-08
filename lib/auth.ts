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

  emailAndPassword: {
    enabled: true,
    async sendResetPassword(data: any, request: any) {
      // Implementa aquí el envío de correo de recuperación
    },
    hooks: {}, // Registro desactivado
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

  callbacks: {
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      if (url === baseUrl || url === baseUrl + '/') {
        return '/planner';
      }
      return url.startsWith(baseUrl) || url.startsWith('/') ? url : baseUrl;
    },

    async session({ session, user }: { session: any; user: any }) {
      session.user.role = user.role;
      return session;
    },
  },
});