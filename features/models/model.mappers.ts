import type { StoredModel } from '@/db/app/schema';
import { formDataToModel, type AnkiModel } from '@/lib/anki-settings';

export function mapStoredModel(storedModel: StoredModel): AnkiModel {
  return formDataToModel(storedModel.modelFormData);
}
