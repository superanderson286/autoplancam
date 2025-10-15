import {
    betterAuth
} from 'better-auth';
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from '../db';
import * as schema from '../auth-schema';

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema,
    }),
    emailAndPassword: {
        enabled: true,
        async sendResetPassword(data, request) {
            // Send an email to the user with a link to reset their password
        },
    },
    socialProviders: {
        //google: {
          //  clientId: process.env.GOOGLE_CLIENT_ID!,
            //clientSecret: process.env.GOOGLE_CLIENT_SECRET!
        //}
    },
});