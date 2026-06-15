import { relations, sql } from 'drizzle-orm';
import {
  index,
  integer,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

export const subtitles = sqliteTable('subtitles', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  relativePath: text('relative_path').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const videos = sqliteTable(
  'videos',
  {
    id: integer('id').primaryKey(),
    name: text('name').notNull(),
    relativePath: text('relative_path').notNull(),
    subtitleId: integer('subtitle_id').references(() => subtitles.id, {
      onDelete: 'set null',
    }),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_videos_subtitle_id').on(table.subtitleId),
  ]
);

export const subtitlesRelations = relations(subtitles, ({ many }) => ({
  videos: many(videos),
}));

export const videosRelations = relations(videos, ({ one }) => ({
  subtitle: one(subtitles, {
    fields: [videos.subtitleId],
    references: [subtitles.id],
  }),
}));

export type Subtitle = typeof subtitles.$inferSelect;
export type NewSubtitle = typeof subtitles.$inferInsert;

export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
