import { integer, text, sqliteTable, sqliteView } from 'drizzle-orm/sqlite-core';

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

export const termBank = sqliteView('term_bank', {
  id: integer('id').notNull(),
  dictionary: text('dictionary').notNull(),
  expression: text('expression').notNull(),
  reading: text('reading').notNull(),
  definitionTags: text('definition_tags'),
  rules: text('rules').notNull(),
  score: integer('score').notNull(),
  definitionsJson: text('definitions_json').notNull(),
  sequence: integer('sequence').notNull(),
  termTags: text('term_tags').notNull(),
}).existing();

export type StoredTerm = typeof termBank.$inferSelect;

// export type ComponentName =
//   | 'View'
//   | 'Text'
//   | 'Ruby'
//   | 'RubyText'
//   | 'RubyFallback'
//   | 'List'
//   | 'ListItem'
//   | 'Table'
//   | 'TableSection'
//   | 'TableRow'
//   | 'TableCell'
//   | 'Link'
//   | 'DictionaryImage'
//   | 'Details'
//   | 'Summary'
//   | 'LineBreak';
//
// export type StoredDefinition =
//   | { type: 'content'; children: ComponentNode[] }
//   | { type: 'deinflection'; term: string; rules: string[] };
//
// export interface ComponentNode {
//   component: ComponentName;
//   props: Record<string, unknown>;
//   children: (ComponentNode | string)[];
//   source?: {
//     tag: string;
//     data?: Record<string, string>;
//     lang?: string;
//     title?: string;
//     style?: Record<string, unknown>;
//   };
// }
