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
.card {
  font-family: Arial, sans-serif;
  font-size: 22px;
  text-align: center;
  color: #222;
  background: #fff;
  padding: 24px;
}

.card-content {
  max-width: 700px;
  margin: 0 auto;
}

.front,
.back,
.image,
.audio {
  margin: 16px 0;
}

.front,
.back {
  font-size: 30px;
  font-weight: 600;
  line-height: 1.4;
}

.image img {
  display: block;
  max-width: 100%;
  max-height: 350px;
  width: auto;
  height: auto;
  margin: 0 auto;
  border-radius: 8px;
}

.audio {
  min-height: 24px;
}

hr#answer {
  border: 0;
  border-top: 1px solid #bbb;
  margin: 28px auto;
  max-width: 500px;
}

.nightMode .card {
  color: #eee;
  background: #222;
}

.nightMode hr#answer {
  border-top-color: #666;
}
`;

export const ModelFields = [
  { name: 'expression' },
  { name: 'reading' },
  { name: 'meaning' },
  { name: 'partOfSpeech' },
  { name: 'exampleSentence' },
  { name: 'exampleTranslation' },
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
  { name: 'partOfSpeech' },
  { name: 'exampleSentence' },
  { name: 'exampleTranslation' },
];

export const BackSideModelFields: AllowedModelField[] = [
  { name: 'expression' },
  { name: 'reading' },
  { name: 'meaning' },
  { name: 'partOfSpeech' },
  { name: 'exampleSentence' },
  { name: 'exampleTranslation' },
  { name: 'FrontSide' },
];

type ModelFieldLabels = Record<ModelFieldName, string>;
export const modelFieldLabels = {
  expression: 'Expression',
  reading: 'Reading',
  meaning: 'Meaning',
  partOfSpeech: 'Part of Speech',
  exampleSentence: 'Example Sentence',
  exampleTranslation: 'Example Translation',
  FrontSide: 'Front Side',
} satisfies ModelFieldLabels;

export const ModelElementsHTML: { name: ModelFieldName; html: string }[] = [
  {
    name: 'FrontSide',
    html: '<div>{{FrontSide}}<div>\n<hr id=answer>',
  },
  {
    name: 'reading',
    html: '<div style="font-size:25px">{{reading}}<div>',
  },
  {
    name: 'expression',
    html: '<div style="font-size:50px">{{expression}}<div>',
  },
  {
    name: 'meaning',
    html: '<div>{{meaning}}<div>',
  },
  {
    name: 'partOfSpeech',
    html: '<div>{{partOfSpeech}}<div>',
  },
  {
    name: 'exampleSentence',
    html: '<div>{{exmapleSentence}}<div>',
  },
  {
    name: 'exampleTranslation',
    html: '<div>{{exampleTranslation}}<div>',
  },
];
