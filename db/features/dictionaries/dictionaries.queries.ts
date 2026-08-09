import { dictionariesDb } from '@/db/dictionaries/client';
import { entries, lookup } from '@/db/dictionaries/schema';
import { Token } from '@kuzulabz/expo-kagome';
import { and, eq, or, sql } from 'drizzle-orm';

export function lookupTokenQuery(token: Token) {
  if (!dictionariesDb) {
    throw new Error('Lookup database is not ready');
  }

  const base_form = token.base_form;
  const reading = token.reading;

  return dictionariesDb
    .selectDistinct({
      id: entries.id,
      dictionary: entries.dictionary,
      kanjiJson: entries.kanjiJson,
      kanaJson: entries.kanaJson,
      senseJson: entries.senseJson,
    })
    .from(lookup)
    .innerJoin(
      entries,
      and(
        eq(entries.dictionary, lookup.dictionary),
        eq(entries.id, lookup.entryId),
      )
    )
    .where(
      or(
        and(eq(lookup.expression, base_form), eq(lookup.reading, reading)),
        eq(lookup.expression, base_form),
        eq(lookup.reading, reading)
      )
    ).orderBy(sql`
      CASE
        WHEN ${lookup.expression} = ${base_form}
         AND ${lookup.reading} = ${reading}
        THEN 0

        WHEN ${lookup.expression} = ${base_form}
        THEN 1

        WHEN ${lookup.reading} = ${reading}
        THEN 2

        ELSE 3
      END
    `);
}

export type InsertInstalledInput = {
  alias: string,
  filePath: string,
}

/**
 * @description use a mapper that maps result to a boolean to
 * check if the application has any dictionaries loaded
 */
export function hasDictionaryQuery() {
  return dictionariesDb.select({ id: lookup.entryId }).from(lookup).limit(1);
}

// export function hasDictionaryQuery() {
//   return dictionariesDb
//     .select({ alias: installed.alias })
//     .from(installed)
//     .limit(1);
// }
//
// export function installedDictionariesQuery() {
//   return dictionariesDb
//     .select()
//     .from(installed);
// }
