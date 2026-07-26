import { useCallback, useMemo } from 'react';
import { Model } from 'genanki-ts';

import { AllowedModelField } from '@/lib/flash-card';
import { ModelFormData } from './model-form';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { allModelsQuery, hydrateStoredModel, upsertModel } from '@/db/repositories/models.repository';

type UpsertModelInput = {
  applicationId?: number;
  modelFormData: ModelFormData;
  model: Model<AllowedModelField[]>;
};

export function useUpsertModel() {
  return useCallback(
    (input: UpsertModelInput) =>
      upsertModel(input),
    [],
  );
}

export function useModels() {
  const query = useMemo(() => allModelsQuery(), []);
  const result = useLiveQuery(query);

  return {
    ...result,
    models: (result.data ?? []).map(hydrateStoredModel),
    isLoading:
      result.updatedAt === undefined && !result.error
  };
}
