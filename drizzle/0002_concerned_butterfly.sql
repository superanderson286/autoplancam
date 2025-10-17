ALTER TABLE "account" RENAME COLUMN "provider" TO "provider_id";--> statement-breakpoint
DROP INDEX "provider_provider_account_id_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "provider_provider_account_id_idx" ON "account" USING btree ("provider_id","provider_account_id");