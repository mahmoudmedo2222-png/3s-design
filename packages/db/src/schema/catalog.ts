import { bigint, boolean, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const timestamps = () => ({
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    subtitle: text('subtitle'),
    description: text('description').notNull(),
    status: text('status').notNull().default('draft'),
    basePrice: numeric('base_price', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('USD'),
    isFeatured: boolean('is_featured').notNull().default(false),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    ...timestamps(),
  },
  (table) => ({
    slugIdx: uniqueIndex('products_slug_idx').on(table.slug),
  }),
);

export const productVariants = pgTable('product_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  fileFormats: jsonb('file_formats')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  dimensions: jsonb('dimensions')
    .$type<Array<{ label: string; width?: number; height?: number; unit?: string }>>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  softwareCompatibility: jsonb('software_compatibility')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  priceDelta: numeric('price_delta', { precision: 12, scale: 2 }).notNull().default('0'),
  isDefault: boolean('is_default').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps(),
});

export const productAssets = pgTable('product_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }),
  assetType: text('asset_type').notNull(),
  storageKey: text('storage_key').notNull(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  width: integer('width'),
  height: integer('height'),
  checksum: text('checksum'),
  assetStatus: text('asset_status').notNull().default('uploaded'),
  scanStatus: text('scan_status').notNull().default('pending'),
  scanResult: jsonb('scan_result')
    .$type<{
      provider?: string;
      verdict?: 'clean' | 'suspicious' | 'infected' | 'unknown';
      reason?: string;
      scannedAt?: string;
    }>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  altText: text('alt_text'),
  sortOrder: integer('sort_order').notNull().default(0),
  isPrimary: boolean('is_primary').notNull().default(false),
  isPublicPreview: boolean('is_public_preview').notNull().default(false),
  ...timestamps(),
});

export const licenses = pgTable(
  'licenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    licenseType: text('license_type').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    priceMultiplier: numeric('price_multiplier', { precision: 8, scale: 2 }).notNull().default('1'),
    allowsCommercialUse: boolean('allows_commercial_use').notNull().default(false),
    allowsResale: boolean('allows_resale').notNull().default(false),
    allowsModification: boolean('allows_modification').notNull().default(true),
    termsMarkdown: text('terms_markdown').notNull(),
    ...timestamps(),
  },
  (table) => ({
    typeIdx: uniqueIndex('licenses_type_idx').on(table.licenseType),
  }),
);

export const productLicensePrices = pgTable(
  'product_license_prices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    licenseId: uuid('license_id')
      .notNull()
      .references(() => licenses.id, { onDelete: 'restrict' }),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('USD'),
    ...timestamps(),
  },
  (table) => ({
    productLicenseIdx: uniqueIndex('product_license_prices_product_license_idx').on(table.productId, table.licenseId),
  }),
);

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parentId: uuid('parent_id'),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps(),
  },
  (table) => ({
    slugIdx: uniqueIndex('categories_slug_idx').on(table.slug),
  }),
);

export const productCategories = pgTable(
  'product_categories',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    productCategoryIdx: uniqueIndex('product_categories_product_category_idx').on(table.productId, table.categoryId),
  }),
);

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    ...timestamps(),
  },
  (table) => ({
    slugIdx: uniqueIndex('tags_slug_idx').on(table.slug),
  }),
);

export const productTags = pgTable(
  'product_tags',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    productTagIdx: uniqueIndex('product_tags_product_tag_idx').on(table.productId, table.tagId),
  }),
);

export const productAttributes = pgTable(
  'product_attributes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: text('value').notNull(),
    label: text('label'),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps(),
  },
  (table) => ({
    productAttributeIdx: uniqueIndex('product_attributes_product_key_value_idx').on(table.productId, table.key, table.value),
  }),
);
