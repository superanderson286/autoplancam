import "better-auth";

declare module "better-auth" {
  interface User {
    role?: string; // Assuming role is an optional string
  }

  interface Session {
    user?: User;
  }
}
