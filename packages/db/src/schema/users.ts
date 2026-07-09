import { sql } from 'drizzle-orm';
import { boolean, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

const timestamps = () => ({
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    fullName: text('full_name').notNull(),
    role: text('role').notNull().default('customer'),
    isEmailVerified: boolean('is_email_verified').notNull().default(false),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps(),
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
  }),
);

export const userProfiles = pgTable('user_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  phone: text('phone'),
  country: text('country'),
  city: text('city'),
  preferredCurrency: text('preferred_currency').notNull().default('USD'),
  preferredLanguage: text('preferred_language').notNull().default('en'),
  avatarUrl: text('avatar_url'),
  buyerProfile: jsonb('buyer_profile')
    .$type<{
      signature?: string;
      colors?: string[];
      styles?: string[];
      moods?: string[];
      useCases?: string[];
      confidence?: 'fresh' | 'warming' | 'strong';
      stage?: 'new' | 'exploring' | 'deciding';
      nextAction?: string;
      reasons?: string[];
      terms?: string[];
      prompt?: string;
      eventCount?: number;
      syncedAt?: string;
    }>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  ...timestamps(),
});
