import { eq, sql } from 'drizzle-orm';

import { appDb } from '@/db/app/client';
import {
  decks,
  type StoredDeck,
} from '@/db/app/schema/decks';

export type UpsertDeckInput = {
  applicationId?: number;
  deckFormData: StoredDeck['deckFormData'];
  deck: StoredDeck['deck'];
};

export function allDecksQuery() {
  return appDb
    .select()
    .from(decks)
    .orderBy(decks.createdAt);
}

export function deckByApplicationIdQuery(
  applicationId: number,
) {
  return appDb
    .select()
    .from(decks)
    .where(eq(decks.applicationId, applicationId))
    .limit(1);
}

export function getDecks(): Promise<StoredDeck[]> {
  return allDecksQuery();
}

export async function getDeckByApplicationId(
  applicationId: number,
): Promise<StoredDeck | null> {
  const [storedDeck] =
    await deckByApplicationIdQuery(applicationId);

  return storedDeck ?? null;
}

export async function upsertDeck({
  applicationId,
  deckFormData,
  deck,
}: UpsertDeckInput): Promise<StoredDeck> {
  const [storedDeck] = await appDb
    .insert(decks)
    .values({
      applicationId,
      deckFormData,
      deck,
    })
    .onConflictDoUpdate({
      target: decks.applicationId,
      set: {
        deckFormData,
        deck,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    })
    .returning();

  if (!storedDeck) {
    throw new Error('Failed to upsert deck');
  }

  return storedDeck;
}

export async function deleteDeck(
  applicationId: number,
): Promise<number | null> {
  const [deletedDeck] = await appDb
    .delete(decks)
    .where(eq(decks.applicationId, applicationId))
    .returning({
      applicationId: decks.applicationId,
    });

  return deletedDeck?.applicationId ?? null;
}
