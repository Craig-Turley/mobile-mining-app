import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { Deck } from 'genanki-ts';

import { AllowedModelField } from '@/lib/flash-card';
import { DeckFormData } from '@/lib/deck-form';

export const decks = sqliteTable("decks", {
  applicationId: integer("application_id")
    .primaryKey({ autoIncrement: true }),

  deckFormData: text("deck_form_data", {
    mode: "json",
  })
    .$type<DeckFormData>()
    .notNull(),

  deck: text("deck", {
    mode: "json",
  })
    .$type<Deck<AllowedModelField[]>>()
    .notNull(),

  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),

  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type StoredDeck = typeof decks.$inferSelect;
export type NewStoredDeck = typeof decks.$inferInsert;
