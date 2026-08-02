import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { Model } from 'genanki-ts';

import { AllowedModelField } from '@/lib/anki-settings';
import { ModelFormData } from '@/lib/anki-settings';

export const models = sqliteTable('models', {
  applicationId: integer('application_id').primaryKey({ autoIncrement: true }),

  modelFormData: text('modelFormData', {
    mode: 'json',
  })
    .$type<ModelFormData>()
    .notNull(),

  model: text('model', {
    mode: 'json',
  })
    .$type<Model<AllowedModelField[]>>()
    .notNull(),

  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),

  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type StoredModel = typeof models.$inferSelect;
export type NewStoredModel = typeof models.$inferInsert;
