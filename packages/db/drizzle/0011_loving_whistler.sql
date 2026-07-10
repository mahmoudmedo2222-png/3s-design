DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM "product_assets" WHERE "asset_status" not in ('uploaded', 'processing', 'ready', 'rejected')) THEN
		RAISE EXCEPTION 'Cannot add product_assets_asset_status_check: invalid product asset status values exist';
	END IF;

	IF EXISTS (SELECT 1 FROM "product_assets" WHERE "scan_status" not in ('pending', 'passed', 'failed', 'skipped')) THEN
		RAISE EXCEPTION 'Cannot add product_assets_scan_status_check: invalid product asset scan status values exist';
	END IF;

	IF EXISTS (SELECT 1 FROM "products" WHERE "status" not in ('draft', 'published', 'archived')) THEN
		RAISE EXCEPTION 'Cannot add products_status_check: invalid product status values exist';
	END IF;

	IF EXISTS (SELECT 1 FROM "download_events" WHERE "status" not in ('allowed', 'denied')) THEN
		RAISE EXCEPTION 'Cannot add download_events_status_check: invalid download event status values exist';
	END IF;

	IF EXISTS (SELECT 1 FROM "orders" WHERE "status" not in ('pending', 'paid', 'refunded')) THEN
		RAISE EXCEPTION 'Cannot add orders_status_check: invalid order status values exist';
	END IF;

	IF EXISTS (SELECT 1 FROM "payments" WHERE "status" not in ('pending', 'paid', 'failed', 'expired', 'refunded')) THEN
		RAISE EXCEPTION 'Cannot add payments_status_check: invalid payment status values exist';
	END IF;

	IF EXISTS (SELECT 1 FROM "refund_requests" WHERE "status" not in ('requested', 'under_review', 'approved', 'rejected')) THEN
		RAISE EXCEPTION 'Cannot add refund_requests_status_check: invalid refund request status values exist';
	END IF;

	IF EXISTS (SELECT 1 FROM "refunds" WHERE "status" not in ('requested', 'approved', 'failed')) THEN
		RAISE EXCEPTION 'Cannot add refunds_status_check: invalid refund status values exist';
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM "product_assets"
		WHERE "asset_status" NOT IN ('uploaded', 'processing', 'ready', 'rejected')
	) THEN
		RAISE EXCEPTION 'Cannot add product_assets_asset_status_check: invalid product asset status values exist';
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM "product_assets"
		WHERE "scan_status" NOT IN ('pending', 'passed', 'failed', 'skipped')
	) THEN
		RAISE EXCEPTION 'Cannot add product_assets_scan_status_check: invalid product asset scan status values exist';
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM "products"
		WHERE "status" NOT IN ('draft', 'published', 'archived')
	) THEN
		RAISE EXCEPTION 'Cannot add products_status_check: invalid product status values exist';
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM "download_events"
		WHERE "status" NOT IN ('allowed', 'denied')
	) THEN
		RAISE EXCEPTION 'Cannot add download_events_status_check: invalid download event status values exist';
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM "orders"
		WHERE "status" NOT IN ('pending', 'paid', 'refunded')
	) THEN
		RAISE EXCEPTION 'Cannot add orders_status_check: invalid order status values exist';
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM "payments"
		WHERE "status" NOT IN ('pending', 'paid', 'failed', 'expired', 'refunded')
	) THEN
		RAISE EXCEPTION 'Cannot add payments_status_check: invalid payment status values exist';
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM "refund_requests"
		WHERE "status" NOT IN ('requested', 'under_review', 'approved', 'rejected')
	) THEN
		RAISE EXCEPTION 'Cannot add refund_requests_status_check: invalid refund request status values exist';
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM "refunds"
		WHERE "status" NOT IN ('requested', 'approved', 'failed')
	) THEN
		RAISE EXCEPTION 'Cannot add refunds_status_check: invalid refund status values exist';
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "product_assets" ADD CONSTRAINT "product_assets_asset_status_check" CHECK ("product_assets"."asset_status" in ('uploaded', 'processing', 'ready', 'rejected'));--> statement-breakpoint
ALTER TABLE "product_assets" ADD CONSTRAINT "product_assets_scan_status_check" CHECK ("product_assets"."scan_status" in ('pending', 'passed', 'failed', 'skipped'));--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_status_check" CHECK ("products"."status" in ('draft', 'published', 'archived'));--> statement-breakpoint
ALTER TABLE "download_events" ADD CONSTRAINT "download_events_status_check" CHECK ("download_events"."status" in ('allowed', 'denied'));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_status_check" CHECK ("orders"."status" in ('pending', 'paid', 'refunded'));--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_status_check" CHECK ("payments"."status" in ('pending', 'paid', 'failed', 'expired', 'refunded'));--> statement-breakpoint
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_status_check" CHECK ("refund_requests"."status" in ('requested', 'under_review', 'approved', 'rejected'));--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_status_check" CHECK ("refunds"."status" in ('requested', 'approved', 'failed'));
