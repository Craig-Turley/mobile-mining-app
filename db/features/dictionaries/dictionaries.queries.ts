import { dictionariesDb } from '@/db/dictionaries/client';
import { dictionaries, termBank } from '@/db/dictionaries/schema';
import { Token } from '@kuzulabz/expo-kagome';
import { eq, or, desc, sql } from 'drizzle-orm';
import { removeDictionaryStyles } from '@/lib/dictionaries/cache';
import { deleteDictionaryAssets } from '@/lib/dictionaries/assets';
import { attachAndBuildViews } from './dictionaries.actions';

export type InsertDictionaryInput = {
  title: string;
  revision: string;
  format?: number;
  version?: number;
  author?: string;
  description?: string;
  attribution?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  css?: string;
};

export async function insertDictionaryQuery({
  title,
  revision,
  format,
  version,
  author,
  description,
  attribution,
  sourceLanguage,
  targetLanguage,
  css,
}: InsertDictionaryInput) {
  return dictionariesDb.insert(dictionaries).values({
    title,
    revision,
    format,
    version,
    author,
    description,
    attribution,
    sourceLanguage,
    targetLanguage,
    css,
  });
}

export async function deleteDictionaryByIdQuery(id: number) {
  let title: string | undefined;
  await dictionariesDb.$client.withTransactionAsync(async () => {
    const dictionary = await dictionariesDb.$client.getFirstAsync<{
      name: string;
    }>(
      'SELECT title AS name FROM dictionaries WHERE id = ?',
      id
    );

    if (!dictionary) {
      throw new Error('Dictionary not found');
    }

    await dictionariesDb.$client.runAsync(
      'DELETE FROM dictionaries WHERE id = ?',
      id
    );

    title = dictionary.name;
  });
  if (title) {
    await attachAndBuildViews();
    removeDictionaryStyles(title);
    deleteDictionaryAssets(title);
  }
}

export function getDictionariesQuery() {
  return dictionariesDb.select().from(dictionaries);
}

export function lookupTokenQuery(token: Token) {
  return lookupExpressionQuery(token.base_form, token.reading);
}

export function lookupExpressionQuery(baseForm: string, reading?: string) {
  if (!dictionariesDb) {
    throw new Error('Lookup database is not ready');
  }

  return dictionariesDb
    .select()
    .from(termBank)
    .where(or(eq(termBank.expression, baseForm), eq(termBank.reading, reading ?? baseForm)))
    .orderBy(
      sql`CASE
        WHEN ${termBank.expression} = ${baseForm}
          AND ${termBank.reading} = ${reading ?? ''}
          THEN 0
        WHEN ${termBank.expression} = ${baseForm}
          THEN 1
        WHEN ${termBank.reading} = ${baseForm}
          THEN 2
        ELSE 3
      END`,
      desc(termBank.score)
    );
}

/**
 * @description use a mapper that maps result to a boolean to
 * check if the application has any dictionaries loaded
 */

export function hasDictionaryQuery() {
  return dictionariesDb.select({ id: dictionaries.id }).from(dictionaries).limit(1);
}
