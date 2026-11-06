import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

export const DICTIONARIES_DB_NAME = 'dictionaries.db';

const sqlite = openDatabaseSync(DICTIONARIES_DB_NAME, { enableChangeListener: true });

sqlite.execSync(`
    PRAGMA temp_store = MEMORY;
`);

export const dictionariesDb = drizzle(sqlite, { schema });
export { schema as dictionariesSchema };
