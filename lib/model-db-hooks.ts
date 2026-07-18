import { useCallback } from 'react';
import { eq, sql } from 'drizzle-orm';
import { Model } from 'genanki-ts';

import { AllowedModelField } from '@/lib/flash-card';
import { appDb } from '@/db/app/client';
import { models, StoredModel } from '@/db/app/schema/models';
import { ModelFormData } from './model-form';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

type UpsertModelInput = {
  applicationId?: number;
  modelFormData: ModelFormData;
  model: Model<AllowedModelField[]>;
};

export function useUpsertModel() {
  return useCallback(
    async ({ applicationId, modelFormData, model }: UpsertModelInput): Promise<StoredModel> => {
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

      return storedModel;
    },
    []
  );
}

export function useModels() {
  const query = useLiveQuery(appDb.select().from(models));

  return {
    ...query,
    models: query.data ?? [],
    isLoading: query.updatedAt === undefined && !query.error,
  };
}

export function useGetModel() {
  return useCallback(async (id: number): Promise<StoredModel | null> => {
    const rows = await appDb.select().from(models).where(eq(models.applicationId, id)).limit(1);

    const stored = rows[0];

    if (!stored) {
      return null;
    }

    return {
      ...stored,
      model: new Model<AllowedModelField[]>({
        id: stored.model.id,
        name: stored.model.name,
        type: stored.model.type,
        mod: stored.model.mod,
        usn: stored.model.usn,
        sortf: stored.model.sortf,
        did: stored.model.did,
        flds: stored.model.flds,
        tmpls: stored.model.tmpls,
        css: stored.model.css,
        latexPre: stored.model.latexPre,
        latexPost: stored.model.latexPost,
        latexsvg: stored.model.latexsvg,
        req: stored.model.req,
        vers: stored.model.vers,
        originalStockKind: stored.model.originalStockKind,
        originalId: stored.model.originalId,
      }),
    };
  }, []);
}

export function useDeleteModel() {
  return useCallback(async (id: number): Promise<number | null> => {
    const deletedRows = await appDb.delete(models).where(eq(models.applicationId, id)).returning({
      applicationId: models.applicationId,
    });

    return deletedRows[0]?.applicationId ?? null;
  }, []);
}
