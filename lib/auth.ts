import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import * as schema from '../db/schema';
import { v4 as uuidv4 } from 'uuid';

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
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),

  emailAndPassword: {
    enabled: true,

    async sendResetPassword(data, request) {
      // Implementa aquí el envío de correo de recuperación
    },

    hooks: {
      async handleSignUp(params: HandleSignUpParams) {
        const { user, data, context } = params;

        // Generamos un ID único para la entrada en la tabla 'account'
        const accountId = uuidv4();

        // Retornamos los datos necesarios para crear la cuenta de credenciales
        return {
          userId: user.id,
          accountId,
          password: data.password,
          providerAccountId: user.email,
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
});