DROP INDEX "token_idx";--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "verification" ADD CONSTRAINT "verification_token_unique" UNIQUE("token");