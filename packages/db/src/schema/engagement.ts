import { integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { orderItems } from './commerce';
import { products } from './catalog';
import { users } from './users';

export const wishlists = pgTable(
  'wishlists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userProductIdx: uniqueIndex('wishlists_user_product_idx').on(table.userId, table.productId),
  }),
);

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    orderItemId: uuid('order_item_id').references(() => orderItems.id, { onDelete: 'set null' }),
    rating: integer('rating').notNull(),
    title: text('title'),
    body: text('body').notNull(),
    status: text('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userProductReviewIdx: uniqueIndex('reviews_user_product_order_item_idx').on(table.userId, table.productId, table.orderItemId),
  }),
);

export const searchEvents = pgTable('search_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  query: text('query'),
  filters: jsonb('filters').$type<Record<string, unknown>>().notNull(),
  resultCount: integer('result_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const productViewEvents = pgTable('product_view_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  sessionId: text('session_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const analyticsDailyProductStats = pgTable(
  'analytics_daily_product_stats',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    views: integer('views').notNull().default(0),
    wishlistAdds: integer('wishlist_adds').notNull().default(0),
    cartAdds: integer('cart_adds').notNull().default(0),
    purchases: integer('purchases').notNull().default(0),
    revenue: numeric('revenue', { precision: 12, scale: 2 }).notNull().default('0'),
  },
  (table) => ({
    productDateIdx: uniqueIndex('analytics_daily_product_stats_product_date_idx').on(table.productId, table.date),
  }),
);

export const aiDiscoverySessions = pgTable('ai_discovery_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('active'),
  title: text('title'),
  context: jsonb('context')
    .$type<{
      colors?: string[];
      styles?: string[];
      keywords?: string[];
      useCases?: string[];
    }>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const aiDiscoveryMessages = pgTable('ai_discovery_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => aiDiscoverySessions.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  content: text('content').notNull(),
  intent: jsonb('intent')
    .$type<{
      keywords?: string[];
      colors?: string[];
      styles?: string[];
      useCases?: string[];
      confidence?: number;
      source?: string;
    }>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  productIds: jsonb('product_ids')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  resultCount: integer('result_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
