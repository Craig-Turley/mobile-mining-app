import { appDb } from '@/db/app/client';
import type { StoredModel } from '@/db/app/schema';
import { mapStoredModel } from '@/features/models/model.mappers';

/** Pre-release JSON contract cleanup; no database columns or migrations change. */
export async function upgradeAnkiData() {
  await appDb.$client.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(`
      DELETE FROM queue WHERE CASE WHEN json_valid(entry) THEN
        json_type(entry, '$.dictionary') IS NOT 'text' OR
        json_type(entry, '$.expression') IS NOT 'text' OR
        json_type(entry, '$.definitions_json') IS NOT 'text'
      ELSE 1 END
    `);

    const rows = await tx.getAllAsync<{
      applicationId: number;
      model: string;
      modelFormData: string;
    }>('SELECT application_id AS applicationId, model, modelFormData FROM models');
    for (const row of rows) {
      const model = JSON.parse(row.model) as StoredModel['model'];
      const modelFormData = JSON.parse(row.modelFormData) as StoredModel['modelFormData'];
      if (
        !model.flds.some((field) => String(field.name) === 'meaning') &&
        !modelFormData.fields.some((field) => String(field.name) === 'meaning')
      )
        continue;
      const normalized = mapStoredModel({ ...row, model, modelFormData } as StoredModel);
      await tx.runAsync(
        'UPDATE models SET model = ?, modelFormData = ? WHERE application_id = ?',
        JSON.stringify(normalized.model),
        JSON.stringify(normalized.modelFormData),
        row.applicationId
      );
    }
  });
}
