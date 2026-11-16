import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { ModelField, RequirementMode } from 'genanki-ts';

export const NoteFieldNames = ['expression', 'reading', 'glossary'] as const;
export type NoteFieldName = (typeof NoteFieldNames)[number];

export const TemplateFieldNames = [...NoteFieldNames, 'FrontSide'] as const;
export type TemplateFieldName = (typeof TemplateFieldNames)[number];

export type AllowedModelField = Omit<ModelField, 'name'> & {
  name: NoteFieldName;
};

export type ModelFormData = {
  applicationId?: number; // NOTE: this is the application identifer
  id: number; // NOTE: this is the stable anki identifier
  name: string;
  fields: AllowedModelField[];
  templates: TemplateFormData[];
};

export type TemplateFormData = {
  id: string;
  name: string;
  frontFields: TemplateFieldName[];
  backFields: TemplateFieldName[];
  rule: RuleFormData;
};

export type RuleFormData = {
  mode: RequirementMode;
  fields: NoteFieldName[];
};

export const models = sqliteTable('models', {
  applicationId: integer('application_id').primaryKey({ autoIncrement: true }),
  modelFormData: text('model_form_data', {
    mode: 'json',
  })
    .$type<ModelFormData>()
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
