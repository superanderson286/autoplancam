ALTER TABLE "account" RENAME COLUMN "hashed_password" TO "password";--> statement-breakpoint
ALTER TABLE "user" RENAME COLUMN "hashed_password" TO "password";