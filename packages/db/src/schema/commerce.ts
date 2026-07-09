import { sql } from 'drizzle-orm';
import { boolean, inet, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { licenses, productAssets, productVariants, products } from './catalog';
import { users } from './users';

const timestamps = () => ({
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const carts = pgTable(
  'carts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    currency: text('currency').notNull().default('USD'),
    ...timestamps(),
  },
  (table) => ({
    userIdx: uniqueIndex('carts_user_id_idx').on(table.userId),
  }),
);

export const cartItems = pgTable(
  'cart_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cartId: uuid('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'restrict' }),
    licenseId: uuid('license_id')
      .notNull()
      .references(() => licenses.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull().default(1),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    ...timestamps(),
  },
  (table) => ({
    cartProductLicenseIdx: uniqueIndex('cart_items_cart_product_variant_license_idx').on(
      table.cartId,
      table.productId,
      table.variantId,
      table.licenseId,
    ),
    cartProductNoVariantLicenseIdx: uniqueIndex('cart_items_cart_product_no_variant_license_idx')
      .on(table.cartId, table.productId, table.licenseId)
      .where(sql`${table.variantId} is null`),
    cartProductVariantLicenseNotNullIdx: uniqueIndex('cart_items_cart_product_variant_license_not_null_idx')
      .on(table.cartId, table.productId, table.variantId, table.licenseId)
      .where(sql`${table.variantId} is not null`),
  }),
);

export const coupons = pgTable(
  'coupons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(),
    couponType: text('coupon_type').notNull(),
    value: numeric('value', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency'),
    maxUses: integer('max_uses'),
    usedCount: integer('used_count').notNull().default(0),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    minOrderTotal: numeric('min_order_total', { precision: 12, scale: 2 }),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps(),
  },
  (table) => ({
    codeIdx: uniqueIndex('coupons_code_idx').on(table.code),
  }),
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    orderNumber: text('order_number').notNull(),
    checkoutSessionId: text('checkout_session_id'),
    idempotencyKey: text('idempotency_key'),
    status: text('status').notNull().default('pending'),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
    discountTotal: numeric('discount_total', { precision: 12, scale: 2 }).notNull().default('0'),
    taxTotal: numeric('tax_total', { precision: 12, scale: 2 }).notNull().default('0'),
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('USD'),
    billingSnapshot: jsonb('billing_snapshot')
      .$type<{
        customerName?: string;
        customerEmail?: string;
        country?: string | null;
        city?: string | null;
        preferredCurrency?: string;
        attribution?: {
          source?: string | null;
          campaign?: string | null;
          medium?: string | null;
          intent?: string | null;
          brief?: string | null;
          referrer?: string | null;
          landingPath?: string | null;
          firstSeenAt?: string | null;
          lastSeenAt?: string | null;
        };
      }>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    couponId: uuid('coupon_id').references(() => coupons.id, { onDelete: 'set null' }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    ...timestamps(),
  },
  (table) => ({
    orderNumberIdx: uniqueIndex('orders_order_number_idx').on(table.orderNumber),
    checkoutSessionIdx: uniqueIndex('orders_checkout_session_idx').on(table.checkoutSessionId),
    userIdempotencyIdx: uniqueIndex('orders_user_idempotency_idx').on(table.userId, table.idempotencyKey),
  }),
);

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'restrict' }),
  licenseId: uuid('license_id')
    .notNull()
    .references(() => licenses.id, { onDelete: 'restrict' }),
  productSnapshot: jsonb('product_snapshot').$type<Record<string, unknown>>().notNull(),
  licenseSnapshot: jsonb('license_snapshot').$type<Record<string, unknown>>().notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  ...timestamps(),
});

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    status: text('status').notNull().default('pending'),
    providerPaymentId: text('provider_payment_id'),
    idempotencyKey: text('idempotency_key'),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('USD'),
    rawResponse: jsonb('raw_response')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    ...timestamps(),
  },
  (table) => ({
    providerPaymentIdx: uniqueIndex('payments_provider_payment_idx').on(table.provider, table.providerPaymentId),
    orderProviderIdempotencyIdx: uniqueIndex('payments_order_provider_idempotency_idx').on(
      table.orderId,
      table.provider,
      table.idempotencyKey,
    ),
  }),
);

export const paymentWebhookEvents = pgTable(
  'payment_webhook_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: text('provider').notNull(),
    eventId: text('event_id').notNull(),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    providerEventIdx: uniqueIndex('payment_webhook_events_provider_event_idx').on(table.provider, table.eventId),
  }),
);

export const entitlements = pgTable(
  'entitlements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    orderItemId: uuid('order_item_id')
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'restrict' }),
    licenseId: uuid('license_id')
      .notNull()
      .references(() => licenses.id, { onDelete: 'restrict' }),
    maxDownloads: integer('max_downloads').notNull().default(5),
    downloadsUsed: integer('downloads_used').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps(),
  },
  (table) => ({
    orderItemIdx: uniqueIndex('entitlements_order_item_idx').on(table.orderItemId),
  }),
);

export const downloadEvents = pgTable('download_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  entitlementId: uuid('entitlement_id')
    .notNull()
    .references(() => entitlements.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  productAssetId: uuid('product_asset_id')
    .notNull()
    .references(() => productAssets.id, { onDelete: 'restrict' }),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  status: text('status').notNull().default('allowed'),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const downloadLimitOverrides = pgTable('download_limit_overrides', {
  id: uuid('id').primaryKey().defaultRandom(),
  entitlementId: uuid('entitlement_id')
    .notNull()
    .references(() => entitlements.id, { onDelete: 'cascade' }),
  addedDownloads: integer('added_downloads').notNull(),
  reason: text('reason').notNull(),
  approvedByUserId: uuid('approved_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const couponRedemptions = pgTable(
  'coupon_redemptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    couponId: uuid('coupon_id')
      .notNull()
      .references(() => coupons.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    redeemedAt: timestamp('redeemed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    couponOrderIdx: uniqueIndex('coupon_redemptions_coupon_order_idx').on(table.couponId, table.orderId),
  }),
);

export const refundRequests = pgTable('refund_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('requested'),
  reason: text('reason').notNull(),
  adminNote: text('admin_note'),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
});

export const refunds = pgTable('refunds', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id')
    .notNull()
    .references(() => payments.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  providerRefundId: text('provider_refund_id'),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('USD'),
  status: text('status').notNull().default('requested'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
