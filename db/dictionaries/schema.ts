import { sqliteView, integer, text } from "drizzle-orm/sqlite-core";

// export const installed = sqliteTable("installed", {
//   alias: text().primaryKey(),
//   filePath: text("file_path").notNull(),
//   installedAt: integer("installed_at", { mode: "timestamp" }).notNull(),
// });

export const entries = sqliteView("entries", {
  id: integer().notNull(),
  dictionary: text().notNull(),
  kanjiJson: text("kanji_json").notNull(),
  kanaJson: text("kana_json").notNull(),
  senseJson: text("sense_json").notNull(),
}).existing();

export const lookup = sqliteView("lookup", {
  dictionary: text().notNull(),
  entryId: integer("entry_id").notNull(),
  expression: text(),
  reading: text(),
}).existing();

export type StoredLookup = typeof lookup.$inferSelect;
export type StoredEntry = typeof entries.$inferSelect;
