import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system/legacy";

const SQLITE_DIR = `${FileSystem.documentDirectory}SQLite/`;

const JMDICT_DB_NAME = "jmdict-v1.db";
const JMDICT_DB_PATH = `${SQLITE_DIR}${JMDICT_DB_NAME}`;

const FILE_DB_NAME = "file-v1.db";
const FILE_DB_PATH = `${SQLITE_DIR}${FILE_DB_NAME}`;

// TODO: put this in env
const REMOTE__JMDICT_DB_URL = `http://localhost:8080/dicts/${JMDICT_DB_NAME}`;

export async function ensureLookupDbInstalled(
  onProgress?: (progress: number) => void
) {
  const sqliteDirInfo = await FileSystem.getInfoAsync(SQLITE_DIR);

  if (!sqliteDirInfo.exists) {
    await FileSystem.makeDirectoryAsync(SQLITE_DIR, {
      intermediates: true,
    });
  }

  const existingDbInfo = await FileSystem.getInfoAsync(JMDICT_DB_PATH);

  if (existingDbInfo.exists) {
    return JMDICT_DB_PATH;
  }

  const tempPath = `${JMDICT_DB_PATH}.download`;

  const oldTempInfo = await FileSystem.getInfoAsync(tempPath);
  if (oldTempInfo.exists) {
    await FileSystem.deleteAsync(tempPath, { idempotent: true });
  }

  const download = FileSystem.createDownloadResumable(
    REMOTE__JMDICT_DB_URL,
    tempPath,
    {},
    (downloadProgress) => {
      const total = downloadProgress.totalBytesExpectedToWrite;
      const written = downloadProgress.totalBytesWritten;

      if (total > 0) {
        onProgress?.(written / total);
      }
    }
  );

  const result = await download.downloadAsync();

  if (!result?.uri) {
    throw new Error("Database download failed.");
  }

  await FileSystem.moveAsync({
    from: tempPath,
    to: JMDICT_DB_PATH,
  });

  return JMDICT_DB_PATH;
}

export async function openLookupDb() {
  const db = await SQLite.openDatabaseAsync(JMDICT_DB_NAME);

  await db.execAsync(`
    PRAGMA query_only = ON;
    PRAGMA temp_store = MEMORY;
  `);

  return db;
}

export async function openFileDb() {
  const db = await SQLite.openDatabaseAsync(FILE_DB_NAME);

  // any permissions go here
  // await db.execAsync(``);

  return db;
}
