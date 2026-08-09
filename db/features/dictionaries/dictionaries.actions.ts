import { dictionariesDb } from "@/db/dictionaries/client";
import { DefaultSQLiteDownloadDirectory, listDirectoryContents } from "@/lib/file-system";

function toSqlAlias(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_]/g, "_");
}

function uriToPath(uri: string): string {
  return decodeURIComponent(uri.replace(/^file:\/\//, ''));
}

export async function attachAndBuildViews() {
  const installed = listDirectoryContents(DefaultSQLiteDownloadDirectory.uri)
    .map(uri => ({
      filePath: uriToPath(uri),
      alias: toSqlAlias(uriToPath(uri).substring(uriToPath(uri).lastIndexOf('/') + 1)),
    }));

  const sqlite = dictionariesDb.$client;

  const currentlyAttached = await sqlite.getAllAsync<{ name: string }>(`PRAGMA database_list;`);
  for (const { name } of currentlyAttached) {
    if (name !== "main" && name !== "temp") {
      await sqlite.execAsync(`DETACH DATABASE "${name.replace(/"/g, '""')}";`);
    }
  }

  await sqlite.execAsync(`DROP VIEW IF EXISTS entries;`);
  await sqlite.execAsync(`DROP VIEW IF EXISTS lookup;`);

  for (const { alias, filePath } of installed) {
    const escapedPath = filePath.replace(/'/g, "''");
    await sqlite.execAsync(`ATTACH DATABASE '${escapedPath}' AS "${alias}";`);
  }

  const entriesUnion = installed.length > 0
    ? installed.map(({ alias }) => `SELECT * FROM "${alias}".entries`).join("\nUNION ALL\n")
    : `SELECT NULL AS id, NULL AS dictionary, NULL AS kanji_json, NULL AS kana_json, NULL AS sense_json WHERE 0`;

  const lookupUnion = installed.length > 0
    ? installed.map(({ alias }) => `SELECT * FROM "${alias}".lookup`).join("\nUNION ALL\n")
    : `SELECT NULL AS dictionary, NULL AS entry_id, NULL AS expression, NULL AS reading WHERE 0`;

  await sqlite.execAsync(`
    CREATE TEMP VIEW entries AS ${entriesUnion};
    CREATE TEMP VIEW lookup AS ${lookupUnion};
  `);
}

/**
 * @throws if any of the insert functions fail
 */
export async function importDictionary(
  sourceUri: string,
) {
  const sqlite = dictionariesDb.$client;
  await sqlite.execAsync('PRAGMA query_only = OFF;');
  try {
    const escapedUri = sourceUri.replace(/'/g, "''");
    await sqlite.execAsync(`
      ATTACH DATABASE '${escapedUri}' AS source_dict;
    `);
    try {
      await sqlite.execAsync(`
        PRAGMA foreign_keys = OFF;
        PRAGMA synchronous = OFF;
        PRAGMA temp_store = MEMORY;
        PRAGMA cache_size = -64000;
      `);
      await sqlite.execAsync('BEGIN;');
      try {
        // Sorted by (dictionary, id) to match entries' clustered PK order,
        // so inserts append rather than triggering B-tree rebalancing.
        await sqlite.execAsync(`
          INSERT INTO entries (
            id,
            dictionary,
            kanji_json,
            kana_json,
            sense_json
          )
          SELECT
            id,
            dictionary,
            kanji_json,
            kana_json,
            sense_json
          FROM source_dict.entries
          ORDER BY dictionary, id;
        `);
        await sqlite.execAsync(`
          INSERT INTO lookup (
            dictionary,
            entry_id,
            expression,
            reading
          )
          SELECT
            dictionary,
            entry_id,
            expression,
            reading
          FROM source_dict.lookup;
        `);
        await sqlite.execAsync('COMMIT;');
      } catch (error) {
        await sqlite.execAsync('ROLLBACK;');
        throw error;
      }
    } finally {
      await sqlite.execAsync(`
        DETACH DATABASE source_dict;
      `);
    }
  } finally {
    await sqlite.execAsync(`
      PRAGMA foreign_keys = ON;
    `);

    console.log("copying done");
  }
}
