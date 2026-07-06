ALTER TABLE "product_assets" ADD COLUMN "asset_status" text DEFAULT 'uploaded' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_assets" ADD COLUMN "scan_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_assets" ADD COLUMN "scan_result" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "checkout_session_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "billing_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_checkout_session_idx" ON "orders" USING btree ("checkout_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_user_idempotency_idx" ON "orders" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_order_provider_idempotency_idx" ON "payments" USING btree ("order_id","provider","idempotency_key");