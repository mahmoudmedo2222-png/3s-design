import { index, inet, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    sessionId: text('session_id').notNull(),
    eventName: text('event_name').notNull(),
    path: text('path').notNull(),
    payload: jsonb('payload').$type<Record<string, string | number | boolean | null>>().notNull(),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    eventNameIdx: index('analytics_events_event_name_idx').on(table.eventName),
    sessionIdx: index('analytics_events_session_idx').on(table.sessionId),
    createdAtIdx: index('analytics_events_created_at_idx').on(table.createdAt),
    userIdx: index('analytics_events_user_idx').on(table.userId),
  }),
);
