import { File, Directory } from 'expo-file-system';
import { JSONParser } from "@streamparser/json";
import { dictionariesDb } from '../dictionaries/client';
import { dictionaries } from '../dictionaries/schema';
import { SQLiteBindValue } from 'expo-sqlite';

const TERM_BANK_PREFIX = "term_bank_";
const TAG_BANK_PREFIX = "tag_bank_";
const STYLES_FILE = "styles.css";
const INDEX = "index.json";

interface DictionaryIndex {
  title: string;
  revision: string;
  format?: 3;
  version?: 3;
  author?: string;
  description?: string;
  attribution?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  [key: string]: unknown;
}

interface Entry {
  expression: string;
  reading: string;
  definitionTags: string | null;
  rules: string;
  score: number;
  definitions: Definition[];
  sequence: number;
  termTags: string;
}

type Definition =
  | { type: 'content'; children: ComponentNode[] }
  | { type: 'deinflection'; term: string; rules: string[] };

interface ComponentNode {
  component: string;
  props: Record<string, unknown>;
  children: (ComponentNode | string)[];
  source?: {
    tag: string;
    data?: Record<string, string>;
    lang?: string;
    title?: string;
    style?: Record<string, unknown>;
  };
}

type RawEntry = [
  expression: string,
  reading: string,
  definitionTags: string | null,
  rules: string,
  score: number,
  definitions: RawDefinition[],
  sequence: number,
  termTags: string,
];

type RawDefinition =
  | { type: 'content'; children: ComponentNode[] }
  | { type: 'deinflection'; term: string; rules: string[] };

// NOTE: this works now since the types are the same but if the types 
// change we will need to address this in the future
function parseDictionaryDefintion(term: RawEntry): Entry {
  const [
    expression,
    reading,
    definitionTags,
    rules,
    score,
    definitions,
    sequence,
    termTags,
  ] = term;

  return {
    expression,
    reading,
    definitionTags,
    rules,
    score,
    definitions,
    sequence,
    termTags,
  };
}

/**
 * @throws if specified path doesnt exist
 */
export async function convert(src: string): Promise<void> {
  await dictionariesDb.$client.withExclusiveTransactionAsync(
    async tx => {
      const directory = new Directory(src);
      if (!directory.exists) {
        throw new Error('Specified src does not exist');
      }

      if (!validStructure(directory)) {
        throw new Error('Invalid dictionary structure');
      }

      const items = directory.list();
      const indexFile = items.find(
        item =>
          item instanceof File &&
          item.name.includes(INDEX)
      );

      if (!(indexFile instanceof File) || !indexFile.exists) {
        throw new Error('Missing dictionary index');
      }

      const index = JSON.parse(
        await indexFile.text()
      ) as DictionaryIndex;

      const dictionaryQuery = dictionariesDb
        .insert(dictionaries)
        .values({
          title: index.title,
          revision: index.revision,
          format: index.format,
          version: index.version,
          author: index.author,
          description: index.description,
          attribution: index.attribution,
          sourceLanguage: index.sourceLanguage,
          targetLanguage: index.targetLanguage,
        })
        .toSQL();

      await tx.runAsync(
        dictionaryQuery.sql,
        dictionaryQuery.params as SQLiteBindValue[]
      );

      const statement = await tx.prepareAsync(`
        INSERT INTO terms (
          dictionary,
          expression,
          reading,
          definition_tags,
          rules,
          score,
          definitions_json,
          sequence,
          term_tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      try {
        for (const item of items) {
          if (item instanceof Directory) {
            // TODO: Handle subdirectories.
            continue;
          }

          if (!(item instanceof File)) {
            continue;
          }

          if (item.name.includes(TERM_BANK_PREFIX)) {
            await streamJsonArray<RawEntry>(
              item,
              async raw => {
                if (!Array.isArray(raw)) {
                  console.error('Unexpected term:', {
                    file: item.name,
                    value: JSON.stringify(raw),
                    type: typeof raw,
                  });

                  throw new Error(
                    `Invalid term entry in ${item.name}`
                  );
                }

                const e = parseDictionaryDefintion(raw);

                await statement.executeAsync([
                  index.title,
                  e.expression,
                  e.reading,
                  e.definitionTags ?? null,
                  e.rules,
                  e.score,
                  JSON.stringify(e.definitions),
                  e.sequence,
                  e.termTags,
                ]);
              }
            );
          } else if (item.name.includes(TAG_BANK_PREFIX)) {
            // TODO
          } else if (item.name.includes(STYLES_FILE)) {
            // TODO
          }
        }
      } finally {
        await statement.finalizeAsync();
      }
    }
  );
}

// TODO: implement this when we have a discriminator
function validStructure(directory: Directory): boolean {
  return true
}

export async function streamJsonArray<T>(
  file: File,
  onEntry: (entry: T) => Promise<void>,
): Promise<void> {
  const parser = new JSONParser({
    paths: ['$.*'],
    keepStack: false,
  });

  const entries: T[] = [];
  parser.onValue = ({ value }) => {
    entries.push(value as T);
  };

  const reader = file.stream().getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      parser.write(value);

      for (const entry of entries) {
        await onEntry(entry);
      }

      entries.length = 0;
    }

    if (!parser.isEnded) {
      parser.end();
    }

    for (const entry of entries) {
      await onEntry(entry);
    }
  } finally {
    reader.releaseLock();
  }
}
