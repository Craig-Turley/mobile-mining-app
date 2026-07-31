// Kanji
// Kana reading
// English definition
// Part of speech
// Common-word indicator
// Japanese example sentence
// English example translation
// Usage labels
// Subject/domain
// Sense notes
// Related words
// Antonyms
// Word origin
// Dialec
import { type ModelField } from 'genanki-ts';

export const DEFAULT_CSS = `
  html,
  body {
    width: 100%;
    margin: 0;
  }

  .card-content {
    display: flex;
    flex-direction: column;

    align-items: center;
    justify-content: flex-start;

    text-align: center;
    box-sizing: border-box;
    padding: 24px;
    gap: 12px;
  }

  .expression {
    font-size: 50px;
  }

  .reading {
    font-size: 25px;
  }

  .meaning {
    font-size: 20px;
  }

  #answer {
    width: 100%;
    margin: 12px 0;
  }
`;

export const ModelFields = [
  { name: 'expression' },
  { name: 'reading' },
  { name: 'meaning' },
  // { name: 'partOfSpeech' },
  // { name: 'exampleSentence' },
  // { name: 'exampleTranslation' },
  { name: 'FrontSide' },
] as const satisfies readonly ModelField[];
export type ModelFieldName = (typeof ModelFields)[number]['name'];

export type AllowedModelField = ModelField & {
  name: ModelFieldName;
};

export const FrontSideModelFields: AllowedModelField[] = [
  { name: 'expression' },
  { name: 'reading' },
  { name: 'meaning' },
  // { name: 'partOfSpeech' },
  // { name: 'exampleSentence' },
  // { name: 'exampleTranslation' },
];

export const BackSideModelFields: AllowedModelField[] = [
  { name: 'expression' },
  { name: 'reading' },
  { name: 'meaning' },
  // { name: 'partOfSpeech' },
  // { name: 'exampleSentence' },
  // { name: 'exampleTranslation' },
  { name: 'FrontSide' },
];

type ModelFieldLabels = Record<ModelFieldName, string>;
export const modelFieldLabels = {
  expression: 'Expression',
  reading: 'Reading',
  meaning: 'Meaning',
  // partOfSpeech: 'Part of Speech',
  // exampleSentence: 'Example Sentence',
  // exampleTranslation: 'Example Translation',
  FrontSide: 'Front Side',
} satisfies ModelFieldLabels;

export const ModelElementsHTML: {
  name: ModelFieldName;
  html: string;
}[] = [
  {
    name: 'FrontSide',
    html: `
      {{FrontSide}}
      <hr id="answer">
    `,
  },
  {
    name: 'reading',
    html: '<div class="reading">{{reading}}</div>',
  },
  {
    name: 'expression',
    html: '<div class="expression">{{expression}}</div>',
  },
  {
    name: 'meaning',
    html: '<div class="meaning">{{meaning}}</div>',
  },
];

// {
//   name: 'partOfSpeech',
//   html: '<div>{{partOfSpeech}}<div>',
// },
// {
//   name: 'exampleSentence',
//   html: '<div>{{exmapleSentence}}<div>',
// },
// {
//   name: 'exampleTranslation',
//   html: '<div>{{exampleTranslation}}<div>',
// },
