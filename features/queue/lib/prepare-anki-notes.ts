import type { StoredModel, StoredQueueItem } from '@/db/app/schema';
import type { Entry } from '@/lib/entry';
import type { AllowedModelField } from '@/lib/anki-settings';
import type { PreparedAnkiNote } from '@/lib/genanki/anki-deck-builder';
import type { MediaFile, NoteFieldValue } from 'genanki-ts';
import { mapStoredModel } from '@/features/models/model.mappers';
import { entryToGlossaryHtml } from '@/lib/entry/entry-glossary';
import { escapeHtml, type GlossaryAssetSource } from '@/lib/entry/html-utils';

export type GlossaryMedia = { filename: string; uri: string };
export type ResolveEntryAsset = (
  entry: Entry,
  path: string,
  source: GlossaryAssetSource
) => Promise<GlossaryMedia>;

export async function prepareAnkiNotes(
  items: readonly StoredQueueItem[],
  storedModels: readonly StoredModel[],
  dictionaries: readonly { title: string; css: string | null }[],
  resolveAsset: ResolveEntryAsset
): Promise<PreparedAnkiNote<AllowedModelField[]>[]> {
  const models = new Map(
    storedModels.map((stored) => [stored.applicationId, mapStoredModel(stored).model])
  );
  const styles = new Map(
    dictionaries.map((dictionary) => [dictionary.title, dictionary.css ?? ''])
  );
  const attachedMedia = new Set<string>();
  const notes: PreparedAnkiNote<AllowedModelField[]>[] = [];

  for (const item of items) {
    const model = models.get(item.modelApplicationId);
    if (!model) throw new Error(`Queued card references missing model ${item.modelApplicationId}.`);
    const entry = item.entry;
    const fields: Partial<Record<AllowedModelField['name'], NoteFieldValue>> = {};
    try {
      for (const field of model.flds) {
        switch (field.name) {
          case 'expression':
            fields.expression = escapeHtml(entry.expression);
            break;
          case 'reading':
            fields.reading = escapeHtml(entry.reading);
            break;
          case 'FrontSide':
            break;
          case 'glossary': {
            const css = styles.get(entry.dictionary);
            if (css === undefined)
              throw new Error(`Source dictionary "${entry.dictionary}" is not installed`);
            const files: MediaFile[] = [];
            const markup = await entryToGlossaryHtml(
              entry,
              css,
              async (path, source = 'dictionary') => {
                const media = await resolveAsset(entry, path, source);
                if (!attachedMedia.has(media.uri)) {
                  attachedMedia.add(media.uri);
                  files.push({ uri: media.uri });
                }
                return media.filename;
              }
            );
            fields.glossary = { markup, files };
            break;
          }
          default:
            throw new Error(`Unsupported application field: ${String(field.name)}`);
        }
      }
    } catch (error) {
      throw new Error(
        `Could not export "${entry.expression}" (${entry.dictionary}): ${error instanceof Error ? error.message : String(error)}`
      );
    }
    notes.push({ model, fields });
  }
  return notes;
}
