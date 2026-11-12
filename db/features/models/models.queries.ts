import { eq, inArray, sql } from 'drizzle-orm';
import { appDb } from '@/db/app/client';
import { models } from '@/db/app/schema/models';
import { type ModelFormData } from '@/lib/anki-settings';

export type UpsertModelInput = {
  applicationId?: number;
  modelFormData: ModelFormData;
};

export function allModelsQuery() {
  return appDb.select().from(models);
}

export function getModelsByIdsQuery(applicationIds: number[]) {
  return appDb.select().from(models).where(inArray(models.applicationId, applicationIds));
}

export function modelByApplicationQuery(applicationId: number) {
  return appDb.select().from(models).where(eq(models.applicationId, applicationId)).limit(1);
}

export function upsertModelQuery({ applicationId, modelFormData }: UpsertModelInput) {
  return appDb
    .insert(models)
    .values({
      applicationId,
      modelFormData,
    })
    .onConflictDoUpdate({
      target: models.applicationId,
      set: {
        modelFormData,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    })
    .returning();
}

export function deleteModelQuery(applicationId: number) {
  return appDb.delete(models).where(eq(models.applicationId, applicationId)).returning({
    applicationId: models.applicationId,
  });
}
