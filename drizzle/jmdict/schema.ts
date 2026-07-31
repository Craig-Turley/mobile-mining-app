import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const lookup = sqliteTable('lookup', {
  entryId: integer('entry_id')
    .notNull()
    .references(() => entries.id, { onDelete: 'cascade' }),
  expression: text(),
  reading: text(),
});

export const entries = sqliteTable('entries', {
  id: integer().primaryKey(),
  kanjiJson: text('kanji_json').notNull(),
  kanaJson: text('kana_json').notNull(),
  senseJson: text('sense_json').notNull(),
});
