import { ModelField, RequirementMode } from 'genanki-ts';

type AnkiModelFieldDefinition = ModelField & {
  label: string;
  allowedOnFront: boolean;
  allowedOnBack: boolean;
  html: string;
  htmlOrder: number;
};

/**
 * Single source of truth for all model fields.
 *
 * `as const` preserves:
 * - the exact field names
 * - the tuple length
 * - the tuple order
 *
 * `satisfies` verifies that every item is compatible with ModelField.
 */
export const AnkiModelFields = [
  {
    name: 'expression',
    label: 'Expression',
    allowedOnFront: true,
    allowedOnBack: true,
    html: '<div class="expression">{{expression}}</div>',
    htmlOrder: 2,
  },
  {
    name: 'reading',
    label: 'Reading',
    allowedOnFront: true,
    allowedOnBack: true,
    html: '<div class="reading">{{reading}}</div>',
    htmlOrder: 1,
  },
  {
    name: 'meaning',
    label: 'Meaning',
    allowedOnFront: true,
    allowedOnBack: true,
    html: '<div class="meaning">{{meaning}}</div>',
    htmlOrder: 3,
  },
  {
    name: 'FrontSide',
    label: 'Front Side',
    allowedOnFront: false,
    allowedOnBack: true,
    html: `
      {{FrontSide}}
      <hr id="answer">
    `,
    htmlOrder: 0,
  },
] as const satisfies readonly AnkiModelFieldDefinition[];

export type ModelFieldName = (typeof AnkiModelFields)[number]['name'];

export type AllowedModelField = ModelField & {
  name: ModelFieldName;
};

type ToModelFields<T extends readonly { readonly name: string }[]> = {
  readonly [Index in keyof T]: {
    readonly name: T[Index]['name'];
  };
};

function toModelFields<const T extends readonly { readonly name: string }[]>(
  fields: T
): ToModelFields<T> {
  return fields.map(({ name }) => ({
    name,
  })) as ToModelFields<T>;
}

export const ModelFields = toModelFields(AnkiModelFields);

export const ModelFieldNames = AnkiModelFields.map((field) => field.name);

export const FrontSideModelFields = AnkiModelFields.filter((field) => field.allowedOnFront).map(
  ({ name }) => ({ name })
) as AllowedModelField[];

export const BackSideModelFields = AnkiModelFields.filter((field) => field.allowedOnBack).map(
  ({ name }) => ({ name })
) as AllowedModelField[];

export const modelFieldLabels = Object.fromEntries(
  AnkiModelFields.map((field) => [field.name, field.label])
) as Record<ModelFieldName, string>;

export const ModelElementsHTML: {
  name: ModelFieldName;
  html: string;
}[] = [...AnkiModelFields]
  .sort((a, b) => a.htmlOrder - b.htmlOrder)
  .map(({ name, html }) => ({
    name,
    html,
  }));

export type DeckFormData = {
  applicationId?: number; // NOTE: this is the application identifer
  id: number; // NOTE: this is the stable anki identifier
  name: string;
  description: string;
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
  frontFields: ModelFieldName[];
  backFields: ModelFieldName[];
  rule: RuleFormData;
};

export type RuleFormData = {
  mode: RequirementMode;
  fields: ModelFieldName[];
};
