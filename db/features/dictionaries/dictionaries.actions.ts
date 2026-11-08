import { dictionariesDb } from '@/db/dictionaries/client';
import { File } from 'expo-file-system';
import { dictionaries } from '@/db/dictionaries/schema';
import { dictionaryDirectory } from '@/lib/dictionaries/assets';

import { DICTIONARY_SQLITE_FILE_NAME } from '@/lib/dictionaries/manifest';

export async function attachAndBuildViews() {
  const installed = (await dictionariesDb.select().from(dictionaries)).map((dictionary) => {
    const file = new File(dictionaryDirectory(dictionary.title), DICTIONARY_SQLITE_FILE_NAME);
    if (!file.exists) throw new Error(`Missing prebuilt database for "${dictionary.title}"`);
    return {
      filePath: decodeURIComponent(file.uri.replace(/^file:\/\//, '')),
      alias: dictionary.title,
    };
  });

  const sqlite = dictionariesDb.$client;
  await sqlite.execAsync(`DROP VIEW IF EXISTS temp.term_bank;`);
  const currentlyAttached = await sqlite.getAllAsync<{ name: string }>(`PRAGMA database_list;`);
  for (const { name } of currentlyAttached) {
    if (name !== 'main' && name !== 'temp') {
      await sqlite.execAsync(`DETACH DATABASE "${name.replace(/"/g, '""')}";`);
    }
  }

  for (const { alias, filePath } of installed) {
    await sqlite.runAsync(`ATTACH DATABASE ? AS "${alias.replace(/"/g, '""')}";`, filePath);
  }

  const entriesUnion =
    installed.length > 0
      ? installed
          .map(({ alias }) => `SELECT * FROM "${alias.replace(/"/g, '""')}".terms`)
          .join('\nUNION ALL\n')
      : `
      SELECT
        NULL AS id,
        NULL AS dictionary,
        NULL AS expression,
        NULL AS reading,
        NULL AS definition_tags,
        NULL AS rules,
        NULL AS score,
        NULL AS definitions_json,
        NULL AS sequence,
        NULL AS term_tags
      WHERE 0
    `;

  await sqlite.execAsync(`
    CREATE TEMP VIEW term_bank AS ${entriesUnion};
  `);
}
