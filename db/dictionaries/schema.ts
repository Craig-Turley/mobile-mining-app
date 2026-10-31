import { integer, text, sqliteTable, index } from 'drizzle-orm/sqlite-core';

export const dictionaries = sqliteTable('dictionaries', {
  id: integer('id').primaryKey(),
  title: text('title').notNull().unique(),
  revision: text('revision').notNull(),
  format: integer('format'),
  version: integer('version'),
  author: text('author'),
  description: text('description'),
  attribution: text('attribution'),
  sourceLanguage: text('source_language'),
  targetLanguage: text('target_language'),
  css: text('css'),
});

export type StoredDictionary = typeof dictionaries.$inferSelect;
export type NewDictionary = typeof dictionaries.$inferInsert;

export const terms = sqliteTable(
  'terms',
  {
    id: integer('id').primaryKey(),
    dictionary: text('dictionary').notNull(),
    expression: text('expression').notNull(),
    reading: text('reading').notNull(),
    definitionTags: text('definition_tags'),
    rules: text('rules').notNull(),
    score: integer('score').notNull(),
    definitionsJson: text('definitions_json').notNull(),
    sequence: integer('sequence').notNull(),
    termTags: text('term_tags').notNull(),
  },
  (table) => [
    index('idx_terms_dictionary').on(table.dictionary),
    index('idx_entries_expression').on(table.expression),
    index('idx_entries_reading').on(table.reading),
  ]
);

export type StoredTerm = typeof terms.$inferSelect;
export type NewTerm = typeof terms.$inferInsert;

export type ComponentName =
  | 'View'
  | 'Text'
  | 'Ruby'
  | 'RubyText'
  | 'RubyFallback'
  | 'List'
  | 'ListItem'
  | 'Table'
  | 'TableSection'
  | 'TableRow'
  | 'TableCell'
  | 'Link'
  | 'DictionaryImage'
  | 'Details'
  | 'Summary'
  | 'LineBreak';

export type StoredDefinition =
  | { type: 'content'; children: ComponentNode[] }
  | { type: 'deinflection'; term: string; rules: string[] };

export interface ComponentNode {
  component: ComponentName;
  props: Record<string, unknown>;
  children: (ComponentNode | string)[];
  source?: {
    tag: string;
    data?: Record<string, string>;
    lang?: string;
    title?: string;
    style?: Record<string, unknown>;
  };
}

// export const entries = sqliteView('entries', {
//   id: integer().notNull(),
//   dictionary: text().notNull(),
//   kanjiJson: text('kanji_json').notNull(),
//   kanaJson: text('kana_json').notNull(),
//   senseJson: text('sense_json').notNull(),
// }).existing();
//
// export const lookup = sqliteView('lookup', {
//   dictionary: text().notNull(),
//   entryId: integer('entry_id').notNull(),
//   expression: text(),
//   reading: text(),
// }).existing();
//
// export type StoredLookup = typeof lookup.$inferSelect;
// export type StoredEntry = typeof entries.$inferSelect;
