import { eq, sql } from 'drizzle-orm';
import { Model } from 'genanki-ts';
import { appDb } from '@/db/app/client';
import { models } from '@/db/app/schema/models';
import { type AllowedModelField } from '@/lib/flash-card';
import { type ModelFormData } from '@/lib/model-form';

export type UpsertModelInput = {
  applicationId?: number;
  modelFormData: ModelFormData;
  model: Model<AllowedModelField[]>;
};

export function allModelsQuery() {
  return appDb.select().from(models);
}

export function modelByApplicationQuery(applicationId: number) {
  return appDb.select().from(models).where(eq(models.applicationId, applicationId)).limit(1);
}

export function upsertModelQuery({ applicationId, modelFormData, model }: UpsertModelInput) {
  return appDb
    .insert(models)
    .values({
      applicationId,
      modelFormData,
      model,
    })
    .onConflictDoUpdate({
      target: models.applicationId,
      set: {
        modelFormData,
        model,
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
