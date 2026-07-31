import type { Entry } from '@/lib/entry';
import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { models } from './models';

export const queue = sqliteTable('queue', {
  applicationId: integer('application_id').primaryKey({ autoIncrement: true }),

  entry: text('entry', {
    mode: 'json',
  })
    .$type<Entry>()
    .notNull(),

  modelApplicationId: integer('model_application_id')
    .notNull()
    .references(() => models.applicationId, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),

  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),

  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export type StoredQueueItem = typeof queue.$inferSelect;
export type NewStoredQueueItem = typeof queue.$inferInsert;
export type QueueItemWithModel = StoredQueueItem & {
  model: {
    name: string;
  };
};
