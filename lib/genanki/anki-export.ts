import * as SQLite from 'expo-sqlite';

import { Directory, File, Paths } from 'expo-file-system';
import { Deck, Package } from 'genanki-ts';
import type { AllowedModelField } from '@/lib/anki-settings';
import {
  createExpoDatabaseAdapter,
  createExpoReaderAdapter,
  createExpoSaveAsAdapter,
  createExpoZipAdapter,
} from './adapters';

const TEMPORARY_EXPORT_DB_NAME = 'temp.db';
const TEMPORARY_ANKI_EXPORT_PATH = 'ANKI_APKG_TEMP';
const DEFAULT_OUTPUT_FILENAME = 'deck.apkg';

export async function exportToAnki(deck: Deck<AllowedModelField[]>): Promise<string> {
  const tmpDb = SQLite.openDatabaseSync(TEMPORARY_EXPORT_DB_NAME);
  const directory = new Directory(Paths.document, TEMPORARY_ANKI_EXPORT_PATH);
  if (!directory.exists) {
    directory.create({
      intermediates: true,
      idempotent: true,
    });
  }

  const pkg = new Package(
    createExpoDatabaseAdapter(tmpDb),
    createExpoZipAdapter(),
    createExpoReaderAdapter(),
    createExpoSaveAsAdapter({
      directory: directory,
      overwrite: true,
    })
  );

  pkg.addDeck(deck);
  const outputFile = DEFAULT_OUTPUT_FILENAME;

  await pkg.writeToFile(outputFile);
  await SQLite.deleteDatabaseAsync(TEMPORARY_EXPORT_DB_NAME);

  return new File(directory, outputFile).uri;
}
