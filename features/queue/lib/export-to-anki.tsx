import { getModelsByIdsQuery } from '@/db/features/models/models.queries';
import { deckByApplicationIdQuery } from '@/db/features/decks/decks.queries';
import { exportToAnki, prepareDeckForExport } from '@/lib/genanki/index';
import { shareFile, AnkiSharingOptions } from '@/lib/sharing/sharing';
import { mapStoredModel } from '@/features/models/model.mappers';
import { QueueItemWithModel } from '@/db/app/schema';

export async function exportQueueToAnki(
  deckId: number,
  queuedItems: QueueItemWithModel[]
) {
  const selectedDeck = await deckByApplicationIdQuery(deckId);
  if (!selectedDeck) {
    throw new Error('selected deck not found');
  }

  const models = await getModelsByIdsQuery(
    queuedItems.map(q => q.modelApplicationId)
  ).then(models => models.map(mapStoredModel));

  const preparedDeck = prepareDeckForExport(
    selectedDeck,
    models,
    queuedItems
  );

  const fileUri = await exportToAnki(preparedDeck);

  await shareFile(fileUri, AnkiSharingOptions);
}
