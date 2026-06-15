import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';
import { FILE_DB_NAME } from '@/lib/sqlite';

const sqlite = openDatabaseSync(FILE_DB_NAME, {
  enableChangeListener: true,
});

sqlite.execSync('PRAGMA foreign_keys = ON;');

export const filesDb = drizzle(sqlite, {
  schema,
});

export { schema as filesSchema };
