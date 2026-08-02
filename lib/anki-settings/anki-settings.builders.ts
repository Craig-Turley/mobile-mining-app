import { CardTemplate, ModelField, ModelRequirement } from 'genanki-ts';
import { ModelElementsHTML, ModelFieldName, TemplateFormData } from './anki-settings.types';

function formatHTML(fields: ModelFieldName[]): string {
  const fieldsSet = new Set(fields);

  const content = ModelElementsHTML.filter(({ name }) => fieldsSet.has(name))
    .map(({ html }) => html)
    .join('\n');

  return `<div class="card-content">${content}</div>`;
}

export function buildTemplates(templateFormData: TemplateFormData[]): CardTemplate[] {
  return templateFormData.map((tmpl) => ({
    name: tmpl.name,
    qfmt: formatHTML(tmpl.frontFields),
    afmt: formatHTML(tmpl.backFields),
  }));
}

export function buildReqs(
  templateFormData: TemplateFormData[],
  flds: readonly ModelField[]
): ModelRequirement[] {
  return templateFormData.map((template, templateIndex) => [
    templateIndex,
    template.rule.mode,
    [...template.rule.fields].map((fieldName) => {
      const fieldIndex = flds.findIndex((field) => field.name === fieldName);

      if (fieldIndex === -1) {
        throw new Error(
          `Rule for template "${template.name}" references unknown field "${fieldName}".`
        );
      }

      return fieldIndex;
    }),
  ]);
}
