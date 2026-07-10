DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "product_assets"
		GROUP BY "storage_key"
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION 'Cannot create product_assets_storage_key_idx: duplicate product_assets.storage_key values exist. Resolve duplicate asset rows before applying migration 0010.';
	END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX "product_assets_storage_key_idx" ON "product_assets" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "product_assets_product_sort_idx" ON "product_assets" USING btree ("product_id","sort_order","file_name");--> statement-breakpoint
CREATE INDEX "product_assets_product_asset_type_idx" ON "product_assets" USING btree ("product_id","asset_type");--> statement-breakpoint
CREATE INDEX "product_variants_product_sort_idx" ON "product_variants" USING btree ("product_id","sort_order","name");--> statement-breakpoint
CREATE INDEX "products_published_listing_idx" ON "products" USING btree ("status","is_featured","published_at","title");--> statement-breakpoint
CREATE INDEX "download_events_entitlement_status_created_at_idx" ON "download_events" USING btree ("entitlement_id","status","created_at");--> statement-breakpoint
CREATE INDEX "download_events_user_created_at_idx" ON "download_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "entitlements_user_created_at_idx" ON "entitlements" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "entitlements_order_active_idx" ON "entitlements" USING btree ("order_id","is_active");--> statement-breakpoint
CREATE INDEX "entitlements_product_created_at_idx" ON "entitlements" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_created_at_idx" ON "order_items" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_user_created_at_idx" ON "orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_status_created_at_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "payments_order_status_created_at_idx" ON "payments" USING btree ("order_id","status","created_at");--> statement-breakpoint
CREATE INDEX "payments_status_created_at_idx" ON "payments" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "refund_requests_user_requested_at_idx" ON "refund_requests" USING btree ("user_id","requested_at");--> statement-breakpoint
CREATE INDEX "refund_requests_order_requested_at_idx" ON "refund_requests" USING btree ("order_id","requested_at");--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "refund_requests"
		WHERE "status" in ('requested', 'under_review', 'approved')
		GROUP BY "order_id"
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION 'Cannot create refund_requests_open_order_idx: duplicate open/approved refund requests exist for at least one order. Resolve manually before applying migration 0010.';
	END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX "refund_requests_open_order_idx" ON "refund_requests" USING btree ("order_id") WHERE "refund_requests"."status" in ('requested', 'under_review', 'approved');
