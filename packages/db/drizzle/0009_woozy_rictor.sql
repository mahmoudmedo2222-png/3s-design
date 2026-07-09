WITH ranked_cart_items AS (
	SELECT
		"id",
		row_number() OVER (
			PARTITION BY "cart_id", "product_id", "license_id", coalesce("variant_id", '00000000-0000-0000-0000-000000000000'::uuid)
			ORDER BY "updated_at" DESC, "created_at" DESC, "id"
		) AS "rank"
	FROM "cart_items"
)
DELETE FROM "cart_items"
WHERE "id" IN (
	SELECT "id"
	FROM ranked_cart_items
	WHERE "rank" > 1
);
--> statement-breakpoint
WITH duplicate_carts AS (
	SELECT
		"id" AS "cart_id",
		first_value("id") OVER (
			PARTITION BY "user_id"
			ORDER BY "updated_at" DESC, "created_at" DESC, "id"
		) AS "keeper_id"
	FROM "carts"
),
ranked_user_cart_items AS (
	SELECT
		"cart_items"."id",
		row_number() OVER (
			PARTITION BY duplicate_carts."keeper_id", "cart_items"."product_id", "cart_items"."license_id", coalesce("cart_items"."variant_id", '00000000-0000-0000-0000-000000000000'::uuid)
			ORDER BY
				CASE WHEN "cart_items"."cart_id" = duplicate_carts."keeper_id" THEN 0 ELSE 1 END,
				"cart_items"."updated_at" DESC,
				"cart_items"."created_at" DESC,
				"cart_items"."id"
		) AS "rank"
	FROM "cart_items"
	INNER JOIN duplicate_carts ON "cart_items"."cart_id" = duplicate_carts."cart_id"
)
DELETE FROM "cart_items"
WHERE "id" IN (
	SELECT "id"
	FROM ranked_user_cart_items
	WHERE "rank" > 1
);
--> statement-breakpoint
WITH duplicate_carts AS (
	SELECT
		"id" AS "cart_id",
		first_value("id") OVER (
			PARTITION BY "user_id"
			ORDER BY "updated_at" DESC, "created_at" DESC, "id"
		) AS "keeper_id"
	FROM "carts"
)
UPDATE "cart_items"
SET
	"cart_id" = duplicate_carts."keeper_id",
	"updated_at" = now()
FROM duplicate_carts
WHERE "cart_items"."cart_id" = duplicate_carts."cart_id"
	AND duplicate_carts."cart_id" <> duplicate_carts."keeper_id";
--> statement-breakpoint
WITH ranked_cart_items AS (
	SELECT
		"id",
		row_number() OVER (
			PARTITION BY "cart_id", "product_id", "license_id", coalesce("variant_id", '00000000-0000-0000-0000-000000000000'::uuid)
			ORDER BY "updated_at" DESC, "created_at" DESC, "id"
		) AS "rank"
	FROM "cart_items"
)
DELETE FROM "cart_items"
WHERE "id" IN (
	SELECT "id"
	FROM ranked_cart_items
	WHERE "rank" > 1
);
--> statement-breakpoint
WITH duplicate_carts AS (
	SELECT
		"id" AS "cart_id",
		first_value("id") OVER (
			PARTITION BY "user_id"
			ORDER BY "updated_at" DESC, "created_at" DESC, "id"
		) AS "keeper_id"
	FROM "carts"
)
DELETE FROM "carts"
USING duplicate_carts
WHERE "carts"."id" = duplicate_carts."cart_id"
	AND duplicate_carts."cart_id" <> duplicate_carts."keeper_id";
--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_cart_product_no_variant_license_idx" ON "cart_items" USING btree ("cart_id","product_id","license_id") WHERE "cart_items"."variant_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_cart_product_variant_license_not_null_idx" ON "cart_items" USING btree ("cart_id","product_id","variant_id","license_id") WHERE "cart_items"."variant_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "carts_user_id_idx" ON "carts" USING btree ("user_id");
