import { jmdictDb, jmdictSchema } from '@/db/jmdict/client';
import { Token } from '@kuzulabz/expo-kagome';
import { and, eq, or, sql } from 'drizzle-orm';

export function lookupTokenQuery(token: Token) {
  if (!jmdictDb) {
    throw new Error('Lookup database is not ready');
  }

  const entries = jmdictSchema.entries;
  const lookup = jmdictSchema.lookup;

  const base_form = token.base_form;
  const reading = token.reading;

  return jmdictDb
    .selectDistinct({
      id: entries.id,
      kanjiJson: entries.kanjiJson,
      kanaJson: entries.kanaJson,
      senseJson: entries.senseJson,
    })
    .from(lookup)
    .innerJoin(entries, eq(entries.id, lookup.entryId))
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
