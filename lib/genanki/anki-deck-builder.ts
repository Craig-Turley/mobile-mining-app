import { Deck, Model } from 'genanki-ts';
import type { Entry } from '@/lib/entry';

import type { StoredDeck, StoredModel, StoredQueueItem } from '@/db/app/schema';

import type { AllowedModelField, ModelFieldName } from '@/lib/anki-settings';

export function prepareDeckForExport(
  storedDeck: StoredDeck,
  storedModels: StoredModel[],
  storedCards: StoredQueueItem[]
): Deck<AllowedModelField[]> {
  const deck = new Deck<AllowedModelField[]>(
    storedDeck.deck.id,
    storedDeck.deck.name,
    storedDeck.deck.description
  );

  const modelMap = new Map<number, Model<AllowedModelField[]>>();

  for (const storedModel of storedModels) {
    modelMap.set(storedModel.applicationId, storedModel.model);
  }

  for (const storedCard of storedCards) {
    const model = modelMap.get(storedCard.modelApplicationId);

    if (!model) {
      throw new Error(`Queued card references missing model ${storedCard.modelApplicationId}.`);
    }

    deck.addNote(model.note(entryToNoteFields(storedCard.entry, model)));
  }

  return deck;
}

type MappableModelFieldName = Exclude<ModelFieldName, 'FrontSide'>;
type EntryToFieldMapper = (entry: Entry) => string;
type EntryToModelMap = Record<MappableModelFieldName, EntryToFieldMapper>;

export const entryToModelMap = {
  expression: (entry) => entry.kanji.map((item) => item.text).join(', '),

  reading: (entry) => entry.kana.map((item) => item.text).join(', '),

  meaning: (entry) =>
    entry.sense
      .flatMap((sense) => sense.gloss)
      .map((gloss) => gloss.text)
      .join(', '),
} satisfies EntryToModelMap;

export function entryToNoteFields(
  entry: Entry,
  model: Model<AllowedModelField[]>
): Record<string, string> {
  const noteFields: Record<string, string> = {};

  for (const field of model.flds) {
    const fieldName = field.name;

    if (fieldName === 'FrontSide') {
      continue;
    }

    noteFields[fieldName] = entryToModelMap[fieldName](entry);
  }

  return noteFields;
}
