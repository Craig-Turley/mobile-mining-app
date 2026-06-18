import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from '@/drizzle/jmdict/schema';
import { JMDICT_DB_NAME } from '@/lib/sqlite';

const sqlite = openDatabaseSync(JMDICT_DB_NAME);
export const jmdictDb = drizzle(sqlite, { schema });

export { schema as jmdictSchema };
