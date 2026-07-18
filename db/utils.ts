import { JMDICT_DB_NAME } from './jmdict/client';
// import * as SQLite from "expo-sqlite";
import { Directory, File, Paths } from 'expo-file-system';

const SQLITE_DIR = new Directory(Paths.document, 'SQLite');
const JMDICT_DB_FILE = new File(SQLITE_DIR, JMDICT_DB_NAME);
const REMOTE__JMDICT_DB_URL = `http://localhost:8080/dicts/${JMDICT_DB_NAME}`;

export async function ensureLookupDbInstalled(onProgress?: (progress: number) => void) {
  if (!SQLITE_DIR.exists) {
    SQLITE_DIR.create({
      intermediates: true,
      idempotent: true,
    });
  }

  if (JMDICT_DB_FILE.exists) {
    return JMDICT_DB_FILE.uri;
  }

  const tempFile = new File(SQLITE_DIR, `${JMDICT_DB_NAME}.download`);

  if (tempFile.exists) {
    tempFile.delete();
  }

  onProgress?.(0);

  const result = await File.downloadFileAsync(REMOTE__JMDICT_DB_URL, tempFile);

  if (!result.exists) {
    throw new Error('Database download failed.');
  }

  tempFile.move(JMDICT_DB_FILE);

  onProgress?.(1);

  return JMDICT_DB_FILE.uri;
}
