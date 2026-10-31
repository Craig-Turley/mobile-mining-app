import type { StoredTerm } from '@/db/dictionaries/schema';
import type { Entry } from './entry.types';

export function mapStoredTermToEntry(entry: StoredTerm): Entry {
  return {
    id: entry.id,
    dictionary: entry.dictionary,
    expression: entry.expression,
    reading: entry.reading,
    definition_tags: entry.definitionTags,
    rules: entry.rules,
    score: entry.score,
    sequence: entry.sequence,
    term_tags: entry.termTags,
    definitions_json: entry.definitionsJson,
  };
}
