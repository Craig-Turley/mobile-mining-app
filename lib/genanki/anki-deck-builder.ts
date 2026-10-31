import { Deck, type Model, type ModelField, type NoteFieldValues } from 'genanki-ts';

export type AnkiDeckDetails = {
  id: number;
  name: string;
  description?: string;
};

export type PreparedAnkiNote<TFields extends readonly ModelField[]> = {
  model: Model<TFields>;
  fields: NoteFieldValues<TFields>;
  tags?: readonly string[];
  guid?: string;
};

export function prepareDeckForExport<TFields extends readonly ModelField[]>(
  details: AnkiDeckDetails,
  notes: readonly PreparedAnkiNote<TFields>[]
): Deck<TFields> {
  const deck = new Deck<TFields>(details.id, details.name, details.description);

  for (const note of notes) {
    deck.addNote(note.model.note(note.fields, note.tags, note.guid));
  }

  return deck;
}
