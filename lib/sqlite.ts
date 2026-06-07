import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system/legacy";

const DB_NAME = "jmdict-v1.db";
const SQLITE_DIR = `${FileSystem.documentDirectory}SQLite/`;
const DB_PATH = `${SQLITE_DIR}${DB_NAME}`;

const REMOTE_DB_URL = `http://localhost:8080/dicts/${DB_NAME}`;

export async function ensureLookupDbInstalled(
  onProgress?: (progress: number) => void
) {
  const sqliteDirInfo = await FileSystem.getInfoAsync(SQLITE_DIR);

  if (!sqliteDirInfo.exists) {
    await FileSystem.makeDirectoryAsync(SQLITE_DIR, {
      intermediates: true,
    });
  }

  const existingDbInfo = await FileSystem.getInfoAsync(DB_PATH);

  if (existingDbInfo.exists) {
    return DB_PATH;
  }

  const tempPath = `${DB_PATH}.download`;

  const oldTempInfo = await FileSystem.getInfoAsync(tempPath);
  if (oldTempInfo.exists) {
    await FileSystem.deleteAsync(tempPath, { idempotent: true });
  }

  const download = FileSystem.createDownloadResumable(
    REMOTE_DB_URL,
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
    to: DB_PATH,
  });

  return DB_PATH;
}

export async function openLookupDb() {
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  await db.execAsync(`
    PRAGMA query_only = ON;
    PRAGMA temp_store = MEMORY;
  `);

  return db;
}
