import { TemplateFormData } from './anki-settings.types';

export function createTemplateFormData(index: number): TemplateFormData {
  return {
    id: `template-${Date.now()}-${index}`,
    name: `Template ${index + 1}`,
    frontFields: [],
    backFields: [],
    rule: {
      mode: 'any',
      fields: [],
    },
  };
}
