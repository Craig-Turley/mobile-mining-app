import { openDatabaseSync } from 'expo-sqlite';
import { drizzle, ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import * as schema from '@/drizzle/jmdict/schema';
import { JMDICT_DB_NAME } from '@/lib/sqlite';
let db: ExpoSQLiteDatabase<typeof schema> | null = null;

export function getJmdictDb() {
  if (!db) {
    const sqlite = openDatabaseSync(JMDICT_DB_NAME);
    db = drizzle(sqlite, { schema });
  }

  return db;
}

export { schema as jmdictSchema };
