import { eq, sql } from 'drizzle-orm';
import { Model } from 'genanki-ts';

import { appDb } from '@/db/app/client';
import {
  models,
  type StoredModel,
} from '@/db/app/schema/models';
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

export function modelByApplicationIdQuery(applicationId: number) {
  return appDb
    .select()
    .from(models)
    .where(eq(models.applicationId, applicationId))
    .limit(1);
}

export async function getModels(): Promise<StoredModel[]> {
  const rows = await allModelsQuery();

  return rows.map(hydrateStoredModel);
}

export async function getModelByApplicationId(
  applicationId: number,
): Promise<StoredModel | null> {
  const [storedModel] = await modelByApplicationIdQuery(applicationId);

  return storedModel
    ? hydrateStoredModel(storedModel)
    : null;
}

export async function upsertModel({
  applicationId,
  modelFormData,
  model,
}: UpsertModelInput): Promise<StoredModel> {
  const [storedModel] = await appDb
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

  if (!storedModel) {
    throw new Error('Failed to upsert model');
  }

  return hydrateStoredModel(storedModel);
}

export async function deleteModel(
  applicationId: number,
): Promise<number | null> {
  const [deletedModel] = await appDb
    .delete(models)
    .where(eq(models.applicationId, applicationId))
    .returning({
      applicationId: models.applicationId,
    });

  return deletedModel?.applicationId ?? null;
}

export function hydrateStoredModel(
  storedModel: StoredModel,
): StoredModel {
  return {
    ...storedModel,
    model: new Model<AllowedModelField[]>({
      id: storedModel.model.id,
      name: storedModel.model.name,
      type: storedModel.model.type,
      mod: storedModel.model.mod,
      usn: storedModel.model.usn,
      sortf: storedModel.model.sortf,
      did: storedModel.model.did,
      flds: storedModel.model.flds,
      tmpls: storedModel.model.tmpls,
      css: storedModel.model.css,
      latexPre: storedModel.model.latexPre,
      latexPost: storedModel.model.latexPost,
      latexsvg: storedModel.model.latexsvg,
      req: storedModel.model.req,
      vers: storedModel.model.vers,
      originalStockKind: storedModel.model.originalStockKind,
      originalId: storedModel.model.originalId,
    }),
  };
}

