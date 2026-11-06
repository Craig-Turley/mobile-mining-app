import { getModelsByIdsQuery } from '@/db/features/models/models.queries';
import { deckByApplicationIdQuery } from '@/db/features/decks/decks.queries';
import { exportToAnki, prepareDeckForExport } from '@/lib/genanki/index';
import { shareFile, AnkiSharingOptions } from '@/lib/sharing/sharing';
import { QueueItemWithModel } from '@/db/app/schema';
import { getDictionariesQuery } from '@/db/features/dictionaries/dictionaries.queries';
import { prepareAnkiNotes } from './prepare-anki-notes';
import { createGlossaryMedia } from './glossary-media';

export async function exportQueueToAnki(deckId: number, queuedItems: QueueItemWithModel[]) {
  const selectedDeck = await deckByApplicationIdQuery(deckId);
  if (!selectedDeck) {
    throw new Error('selected deck not found');
  }

  const models = await getModelsByIdsQuery([
    ...new Set(queuedItems.map((q) => q.modelApplicationId)),
  ]);
  const dictionaries = await getDictionariesQuery();
  const media = createGlossaryMedia();
  let fileUri: string;
  try {
    const notes = await prepareAnkiNotes(queuedItems, models, dictionaries, media.resolve);
    const preparedDeck = prepareDeckForExport(selectedDeck.deck, notes);
    fileUri = await exportToAnki(preparedDeck);
  } finally {
    media.dispose();
  }

  await shareFile(fileUri, AnkiSharingOptions);
}
