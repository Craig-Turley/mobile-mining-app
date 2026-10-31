import * as SQLite from 'expo-sqlite';

import { Directory, File, Paths } from 'expo-file-system';
import { Package, type Deck, type ModelField } from 'genanki-ts';
import {
  createExpoDatabaseAdapter,
  createExpoReaderAdapter,
  createExpoSaveAsAdapter,
  createExpoZipAdapter,
} from './adapters';

const TEMPORARY_ANKI_EXPORT_PATH = 'ANKI_APKG_TEMP';
const DEFAULT_OUTPUT_FILENAME = 'deck.apkg';

export async function exportToAnki<TFields extends readonly ModelField[]>(
  deck: Deck<TFields>
): Promise<string> {
  const exportId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const databaseName = `anki-export-${exportId}.db`;
  const tmpDb = SQLite.openDatabaseSync(databaseName);
  const directory = new Directory(Paths.cache, TEMPORARY_ANKI_EXPORT_PATH, exportId);
  const adapter = createExpoDatabaseAdapter(tmpDb);
  let closed = false;
  const close = async () => {
    if (!closed) {
      await adapter.close();
      closed = true;
    }
  };

  try {
    directory.create({ intermediates: true, idempotent: true });
    const pkg = new Package(
      { ...adapter, close },
      createExpoZipAdapter(),
      createExpoReaderAdapter(),
      createExpoSaveAsAdapter({
        directory: directory,
        overwrite: true,
      })
    );

    pkg.addDeck(deck);
    await pkg.writeToFile(DEFAULT_OUTPUT_FILENAME);
    return new File(directory, DEFAULT_OUTPUT_FILENAME).uri;
  } catch (error) {
    if (directory.exists) directory.delete();
    throw error;
  } finally {
    try {
      await close();
    } finally {
      await SQLite.deleteDatabaseAsync(databaseName);
    }
  }
}
