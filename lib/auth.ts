// auth.ts

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
// CAMBIO CLAVE: Importamos las tablas de esquema que Better Auth necesita
import { 
  users as user,           // Importamos 'user'
  sessions as session,        // Importamos 'session'
  accounts as account,        // Importamos 'account'
  verification    // Importamos 'verification'
} from '../db/schema';
import { v4 as uuidv4 } from 'uuid';

// Creamos un objeto que contiene solo los modelos de tablas. 
// Esto resuelve el error [# Drizzle Adapter]: The model "user" was not found...
const authSchema = {
    user,
    session,
    account,
    verificationToken: verification, // Renombramos 'verification' a 'verificationToken' si la librería lo espera
};


// Definimos el tipo esperado para los parámetros del hook handleSignUp
type HandleSignUpParams = {
  user: {
    id: string;
    email: string;
  };
  data: {
    password: string;
    email: string;
    [key: string]: any;
  };
  context: unknown;
};

export const auth = betterAuth({
  secret: process.env.AUTH_SECRET!,
  baseURL: process.env.NEXT_PUBLIC_APP_URL!,
  database: drizzleAdapter(db, {
    provider: 'pg',
    // CAMBIO CLAVE: Pasamos el objeto de esquema filtrado y nombrado correctamente
    schema: authSchema, 
  }),

  emailAndPassword: {
    enabled: true,

    async sendResetPassword(data, request) {
      // Implementa aquí el envío de correo de recuperación
    },

    hooks: {
      async handleSignUp(params: HandleSignUpParams) {
        const { user: newUser, data, context } = params;

        // Generamos un ID único para la entrada en la tabla 'account'
        const accountId = uuidv4();

        // Retornamos los datos necesarios para crear la cuenta de credenciales
        // El hook para Credential se ve correcto:
        return {
          userId: newUser.id,
          accountId,
          password: data.password,
          providerAccountId: newUser.email,
        };
      },
    },
  },

  socialProviders: {
    // google: {
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    // }
  },
  pages: {
    signIn: "/auth/sign-in",
    signUp: "/auth/sign-up",
  }
});