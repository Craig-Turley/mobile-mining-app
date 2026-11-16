import type { Model } from 'genanki-ts';
import { NoteFieldNames, TemplateFieldNames } from '@/db/app/schema/models';
import type { AllowedModelField, TemplateFieldName } from '@/db/app/schema/models';

type AnkiTemplateFieldDefinition = {
  label: string;
  allowedOnFront: boolean;
  allowedOnBack: boolean;
  html: string;
  htmlOrder: number;
};

export type AnkiModel = Model<AllowedModelField[]>;

export const AnkiTemplateFields = {
  expression: {
    name: 'expression',
    label: 'Expression',
    allowedOnFront: true,
    allowedOnBack: true,
    html: '<div class="expression">{{expression}}</div>',
    htmlOrder: 2,
  },
  reading: {
    name: 'reading',
    label: 'Reading',
    allowedOnFront: true,
    allowedOnBack: true,
    html: '<div class="reading">{{reading}}</div>',
    htmlOrder: 1,
  },
  glossary: {
    name: 'glossary',
    label: 'Glossary',
    allowedOnFront: true,
    allowedOnBack: true,
    html: '<div class="glossary">{{glossary}}</div>',
    htmlOrder: 3,
  },
  FrontSide: {
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
} as const satisfies {
  [Name in TemplateFieldName]: AnkiTemplateFieldDefinition & { name: Name };
};

const templateFields = TemplateFieldNames.map((name) => AnkiTemplateFields[name]);

export const ModelFields: readonly AllowedModelField[] = NoteFieldNames.map((name) => ({ name }));

export const FrontSideModelFields = templateFields
  .filter((field) => field.allowedOnFront)
  .map(({ name }) => ({ name }));

export const BackSideModelFields = templateFields
  .filter((field) => field.allowedOnBack)
  .map(({ name }) => ({ name }));

export const modelFieldLabels = Object.fromEntries(
  templateFields.map((field) => [field.name, field.label])
) as Record<TemplateFieldName, string>;

export const ModelElementsHTML: {
  name: TemplateFieldName;
  html: string;
}[] = [...templateFields]
  .sort((a, b) => a.htmlOrder - b.htmlOrder)
  .map(({ name, html }) => ({
    name,
    html,
  }));
