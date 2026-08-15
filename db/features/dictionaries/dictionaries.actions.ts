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
