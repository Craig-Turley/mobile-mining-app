import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';
export const FILE_DB_NAME = "file-v1.db";

const sqlite = openDatabaseSync(FILE_DB_NAME, {
  enableChangeListener: true,
});

sqlite.execSync('PRAGMA foreign_keys = ON;');

export const filesDb = drizzle(sqlite, {
  schema,
});

export { schema as filesSchema };
