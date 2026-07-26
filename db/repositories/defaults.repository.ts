import { eq, sql } from 'drizzle-orm';

import { appDb } from '@/db/app/client';
import {
  defaults,
  type StoredDefaults,
} from '@/db/app/schema/defaults';

const DEFAULTS_APPLICATION_ID = 1;

export type SetDefaultsInput = {
  modelApplicationId: number | null;
  deckApplicationId: number | null;
};

export function getAppDefaultsQuery() {
  return appDb
    .select()
    .from(defaults)
    .where(eq(defaults.applicationId, DEFAULTS_APPLICATION_ID))
    .limit(1);
}

export async function getAppDefaults(): Promise<StoredDefaults | null> {
  const [storedDefaults] = await getAppDefaultsQuery()
  return storedDefaults ?? null;
}

export async function setAppDefaults({
  modelApplicationId,
  deckApplicationId,
}: SetDefaultsInput): Promise<StoredDefaults> {
  const [storedDefaults] = await appDb
    .insert(defaults)
    .values({
      applicationId: DEFAULTS_APPLICATION_ID,
      modelApplicationId,
      deckApplicationId,
    })
    .onConflictDoUpdate({
      target: defaults.applicationId,
      set: {
        modelApplicationId,
        deckApplicationId,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    })
    .returning();

  if (!storedDefaults) {
    throw new Error('Failed to save application defaults');
  }

  return storedDefaults;
}

export async function setDefaultModel(
  modelApplicationId: number | null,
): Promise<StoredDefaults> {
  const [storedDefaults] = await appDb
    .insert(defaults)
    .values({
      applicationId: DEFAULTS_APPLICATION_ID,
      modelApplicationId,
    })
    .onConflictDoUpdate({
      target: defaults.applicationId,
      set: {
        modelApplicationId,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    })
    .returning();

  if (!storedDefaults) {
    throw new Error('Failed to save default model');
  }

  return storedDefaults;
}

export async function setDefaultDeck(
  deckApplicationId: number | null,
): Promise<StoredDefaults> {
  const [storedDefaults] = await appDb
    .insert(defaults)
    .values({
      applicationId: DEFAULTS_APPLICATION_ID,
      deckApplicationId,
    })
    .onConflictDoUpdate({
      target: defaults.applicationId,
      set: {
        deckApplicationId,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    })
    .returning();

  if (!storedDefaults) {
    throw new Error('Failed to save default deck');
  }

  return storedDefaults;
}

export async function clearAppDefaults(): Promise<boolean> {
  const deletedDefaults = await appDb
    .delete(defaults)
    .where(eq(defaults.applicationId, DEFAULTS_APPLICATION_ID))
    .returning({
      applicationId: defaults.applicationId,
    });

  return deletedDefaults.length > 0;
}
