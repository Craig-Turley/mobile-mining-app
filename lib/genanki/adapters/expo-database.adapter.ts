import * as SQLite from 'expo-sqlite';
import type { PackageDatabase } from 'genanki-ts';

export function createExpoDatabaseAdapter(sqliteDb: SQLite.SQLiteDatabase): PackageDatabase {
  return {
    async run(sql, values = []) {
      const result = await sqliteDb.runAsync(sql, [...values] as SQLite.SQLiteBindValue[]);

      return {
        changes: result.changes,
        lastInsertRowId: result.lastInsertRowId ?? null,
      };
    },

    async prepare(sql) {
      const statement = await sqliteDb.prepareAsync(sql);

      return {
        async run(values = []) {
          const result = await statement.executeAsync([...values] as SQLite.SQLiteBindValue[]);

          return {
            changes: result.changes,
            lastInsertRowId: result.lastInsertRowId ?? null,
          };
        },

        async finalize() {
          await statement.finalizeAsync();
        },
      };
    },

    async exec(sql) {
      await sqliteDb.execAsync(sql);
    },

    async export() {
      return sqliteDb.serializeAsync();
    },

    async close() {
      await sqliteDb.closeAsync();
    },
  };
}
