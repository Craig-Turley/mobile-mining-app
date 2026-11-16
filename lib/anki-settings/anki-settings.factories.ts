import type { NoteFieldName, TemplateFormData } from '@/db/app/schema/models';

export function createTemplateFormData(
  index: number,
  fields: readonly NoteFieldName[] = []
): TemplateFormData {
  return {
    id: `template-${Date.now()}-${index}`,
    name: `Template ${index + 1}`,
    frontFields: [],
    backFields: [],
    rule: {
      mode: 'any',
      fields: [...fields],
    },
  };
}
