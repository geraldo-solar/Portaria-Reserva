CREATE TYPE "public"."payment_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."payment_method" ADD VALUE 'pix_online';--> statement-breakpoint
ALTER TYPE "public"."payment_method" ADD VALUE 'credito';--> statement-breakpoint
ALTER TYPE "public"."payment_method" ADD VALUE 'debito';--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "cielo_payment_id" varchar(100);--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "pix_qr_code" text;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "pix_qr_code_text" text;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "pix_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "payment_status" "payment_status";--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "is_online_sale" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "cielo_return_code" varchar(10);--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "cielo_return_message" text;