import { eq, sql } from 'drizzle-orm';

import { appDb } from '@/db/app/client';
import { decks, type StoredDeck } from '@/db/app/schema/decks';

export type UpsertDeckInput = {
  applicationId?: number;
  deckFormData: StoredDeck['deckFormData'];
  deck: StoredDeck['deck'];
};

export function allDecksQuery() {
  return appDb.select().from(decks).orderBy(decks.createdAt);
}

export function deckByApplicationIdQuery(applicationId: number) {
  return appDb.query.decks.findFirst({
    where: eq(decks.applicationId, applicationId),
  });
}

export function upsertDeckQuery({ applicationId, deckFormData, deck }: UpsertDeckInput) {
  return appDb
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
}

export function deleteDeckQuery(applicationId: number) {
  return appDb.delete(decks).where(eq(decks.applicationId, applicationId)).returning({
    applicationId: decks.applicationId,
  });
}
