ALTER TABLE "products" RENAME COLUMN "spec_value" TO "specs";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "spec_unit";