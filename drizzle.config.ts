import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

export default {
  schema: "./db/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    table: "__drizzle_migrations",
    schema: "drizzle"
  }
} satisfies Config;
