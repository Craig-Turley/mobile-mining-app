import { AllowedModelField, TemplateFormData } from './anki-settings.types';

export function createTemplateFormData(index: number, fields?: AllowedModelField[]): TemplateFormData {
  return {
    id: `template-${Date.now()}-${index}`,
    name: `Template ${index + 1}`,
    frontFields: [],
    backFields: [],
    rule: {
      mode: 'any',
      fields: fields ? fields.map(field => field.name) : [],
    },
  };
}
