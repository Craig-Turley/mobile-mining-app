import { eq, sql } from 'drizzle-orm';

import { appDb } from '@/db/app/client';
import { defaults } from '@/db/app/schema/defaults';

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

export function setAppDefaultsQuery({ modelApplicationId, deckApplicationId }: SetDefaultsInput) {
  return appDb
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
}

export function setDefaultModelQuery(modelApplicationId: number | null) {
  return appDb
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
}

export function setDefaultDeckQuery(deckApplicationId: number | null) {
  return appDb
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
}

export function clearAppDefaults() {
  return appDb
    .delete(defaults)
    .where(eq(defaults.applicationId, DEFAULTS_APPLICATION_ID))
    .returning({
      applicationId: defaults.applicationId,
    });
}
