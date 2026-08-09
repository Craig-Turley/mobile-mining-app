import { openDatabaseAsync, openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

export const DICTIONARIES_DB_NAME = 'dictionaries.db';

const sqlite = openDatabaseSync(
  DICTIONARIES_DB_NAME,
  { enableChangeListener: true },
);

sqlite.execSync(`
    PRAGMA temp_store = MEMORY;
`);

export const dictionariesDb = drizzle(sqlite, { schema });
export { schema as dictionariesSchema };

export async function newDictionaryClientAsync(dictionaryName: string) {
  const sqlite = await openDatabaseAsync(dictionaryName, {});

  sqlite.execAsync(`
    PRAGMA query_only = ON;
    PRAGMA temp_store = MEMORY;
  `);

  return drizzle(sqlite, { schema });
}
