import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export type DeckFormData = {
  applicationId?: number; // NOTE: this is the application identifer
  id: number; // NOTE: this is the stable anki identifier
  name: string;
  description: string;
};

export const decks = sqliteTable('decks', {
  applicationId: integer('application_id').primaryKey({ autoIncrement: true }),
  deckFormData: text('deck_form_data', {
    mode: 'json',
  })
    .$type<DeckFormData>()
    .notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type StoredDeck = typeof decks.$inferSelect;
export type NewStoredDeck = typeof decks.$inferInsert;
