import 'better-auth';

declare module 'better-auth' {
  interface Session {
    user: {
      role?: string;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {}
}

declare module '@/lib/auth' {
  import { BetterAuthInstance } from 'better-auth';
  const auth: BetterAuthInstance;
  export { auth };
}