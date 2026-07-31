import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './generated/schema';

export const JMDICT_DB_NAME = 'jmdict-v1.db';
const sqlite = openDatabaseSync(JMDICT_DB_NAME);

sqlite.execSync(`
    PRAGMA query_only = ON;
    PRAGMA temp_store = MEMORY;
  `);

export const jmdictDb = drizzle(sqlite, { schema });

export { schema as jmdictSchema };
