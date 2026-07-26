import { CardTemplate, Model, ModelField, ModelRequirement, RequirementMode } from 'genanki-ts';
import { AllowedModelField, DEFAULT_CSS, ModelElementsHTML, ModelFieldName } from './flash-card';

export type ModelFormData = {
  applicationId?: number;
  id: number;
  name: string;
  fields: AllowedModelField[];
  templates: TemplateFormData[];
};

export type TemplateFormData = {
  id: string;
  name: string;
  frontFields: ModelFieldName[];
  backFields: ModelFieldName[];
  rule: RuleFormData;
};

export type RuleFormData = {
  mode: RequirementMode;
  fields: ModelFieldName[];
};

export function createTemplateFormData(index: number): TemplateFormData {
  return {
    id: `template-${Date.now()}-${index}`,
    name: `Template ${index + 1}`,
    frontFields: [],
    backFields: [],
    rule: { mode: 'any', fields: [] },
  };
}

function formatHTML(fields: ModelFieldName[]): string {
  const fieldsSet = new Set(fields);

  const content = ModelElementsHTML
    .filter(({ name }) => fieldsSet.has(name))
    .map(({ html }) => html)
    .join('\n');

  return `<div class="card-content">${content}</div>`;
}

function buildTemplates(templateFormData: TemplateFormData[]): CardTemplate[] {
  return templateFormData.map((tmpl) => ({
    name: tmpl.name,
    qfmt: formatHTML(tmpl.frontFields),
    afmt: formatHTML(tmpl.backFields),
  }));
}

function buildReqs(
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

export function formDataToModel(formData: ModelFormData): Model<AllowedModelField[]> {
  return new Model({
    id: Number(formData.id),
    name: formData.name,
    flds: formData.fields,
    tmpls: buildTemplates(formData.templates),
    req: buildReqs(formData.templates, formData.fields),
    css: DEFAULT_CSS,
  });
}
