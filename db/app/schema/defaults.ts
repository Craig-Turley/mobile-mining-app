import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { models } from './models';
import { decks } from './decks';

export const defaults = sqliteTable('defaults', {
  applicationId: integer('application_id').primaryKey().default(1),

  modelApplicationId: integer('model_application_id').references(() => models.applicationId, {
    onDelete: 'set null',
    onUpdate: 'cascade',
  }),

  deckApplicationId: integer('deck_application_id').references(() => decks.applicationId, {
    onDelete: 'set null',
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

export type StoredDefaults = typeof defaults.$inferSelect;
export type NewStoredDefaults = typeof defaults.$inferInsert;
