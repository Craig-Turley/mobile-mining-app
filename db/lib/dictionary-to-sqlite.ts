import { File, Directory } from 'expo-file-system';
import { JSONParser } from '@streamparser/json';
import { dictionariesDb } from '../dictionaries/client';
import { dictionaries, type ComponentNode, type StoredDefinition } from '../dictionaries/schema';
import { SQLiteBindValue } from 'expo-sqlite';
import { parseManifest } from '@/lib/dictionaries/manifest';
import { dictionaryAssetDirectory } from '@/lib/dictionaries/assets';
import { setDictionaryStyles } from '@/lib/dictionaries/cache';
import { compileCSS } from '@/lib/dictionaries/css';

const components = new Set([
  'View',
  'Text',
  'Ruby',
  'RubyText',
  'RubyFallback',
  'List',
  'ListItem',
  'Table',
  'TableSection',
  'TableRow',
  'TableCell',
  'Link',
  'DictionaryImage',
  'Details',
  'Summary',
  'LineBreak',
]);
type RawEntry = [string, string, string | null, string, number, StoredDefinition[], number, string];

function validateEntry(value: unknown, assets: Set<string>): asserts value is RawEntry {
  if (
    !Array.isArray(value) ||
    value.length !== 8 ||
    ![0, 1, 3, 7].every((i) => typeof value[i] === 'string') ||
    !(value[2] === null || typeof value[2] === 'string') ||
    !Number.isFinite(value[4]) ||
    !Number.isSafeInteger(value[6]) ||
    !Array.isArray(value[5])
  )
    throw new Error('Invalid transformed term tuple');
  function node(child: unknown, depth: number) {
    if (depth > 128) throw new Error('Dictionary content nesting exceeds 128 levels');
    if (typeof child === 'string') return;
    if (!child || typeof child !== 'object') throw new Error('Invalid dictionary node');
    const n = child as ComponentNode;
    if (
      !components.has(n.component) ||
      !n.props ||
      typeof n.props !== 'object' ||
      Array.isArray(n.props) ||
      !Array.isArray(n.children) ||
      (n.source &&
        (typeof n.source.tag !== 'string' ||
          (n.source.style &&
            (typeof n.source.style !== 'object' || Array.isArray(n.source.style))) ||
          (n.source.data &&
            (typeof n.source.data !== 'object' ||
              Array.isArray(n.source.data) ||
              !Object.values(n.source.data).every((v) => typeof v === 'string')))))
    )
      throw new Error('Invalid dictionary component');
    if (
      n.component === 'DictionaryImage' &&
      (typeof n.props.assetPath !== 'string' || !assets.has(n.props.assetPath))
    )
      throw new Error('Image asset missing from manifest');
    n.children.forEach((c) => node(c, depth + 1));
  }
  for (const definition of value[5]) {
    if (definition?.type === 'content' && Array.isArray(definition.children))
      definition.children.forEach((c: unknown) => {
        if (typeof c === 'string') throw new Error('Definition roots must be component nodes');
        node(c, 0);
      });
    else if (
      definition?.type !== 'deinflection' ||
      typeof definition.term !== 'string' ||
      !Array.isArray(definition.rules) ||
      !definition.rules.every((r: unknown) => typeof r === 'string')
    )
      throw new Error('Invalid transformed definition');
  }
}

/** Import only completed transformer output. Files are staged, then promoted inside the DB transaction. */
export async function convert(src: string): Promise<void> {
  const directory = new Directory(src);
  if (!directory.exists) throw new Error('Specified dictionary directory does not exist');
  const manifest = parseManifest(JSON.parse(await new File(directory, 'manifest.json').text()));
  const index = JSON.parse(await new File(directory, 'index.json').text());
  if (
    !index ||
    typeof index.title !== 'string' ||
    !index.title.trim() ||
    typeof index.revision !== 'string' ||
    (index.format ?? index.version) !== 3
  )
    throw new Error('Invalid dictionary index');
  for (const path of [
    ...manifest.termBanks.map((b) => b.path),
    ...(manifest.styles ? [manifest.styles] : []),
    ...manifest.assets.map((a) => a.path),
  ]) {
    if (!new File(directory, path).exists) throw new Error(`Missing dictionary file: ${path}`);
  }
  const css = manifest.styles ? await new File(directory, manifest.styles).text() : '';
  compileCSS(css); // Validate before touching persistent state.
  const destination = dictionaryAssetDirectory(index.title);
  destination.parentDirectory.create({ intermediates: true, idempotent: true });
  const stage = new Directory(
    destination.parentDirectory,
    `.import-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  stage.create();
  let promoted = false;
  try {
    for (const asset of manifest.assets) {
      // parseManifest has already validated all relative paths.
      const target = new File(stage, asset.path);
      target.parentDirectory.create({ intermediates: true, idempotent: true });
      new File(directory, asset.path).copy(target);
    }
    await dictionariesDb.$client.withExclusiveTransactionAsync(async (tx) => {
      if (await tx.getFirstAsync('SELECT id FROM dictionaries WHERE title = ?', index.title))
        throw new Error(
          'Dictionary is already imported; delete it before importing a new revision'
        );
      if (destination.exists) destination.delete(); // Recover an orphan from an interrupted import.
      const query = dictionariesDb
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
          css,
        })
        .toSQL();
      await tx.runAsync(query.sql, query.params as SQLiteBindValue[]);
      const statement = await tx.prepareAsync(
        `INSERT INTO terms (dictionary, expression, reading, definition_tags, rules, score, definitions_json, sequence, term_tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      try {
        const assets = new Set(manifest.assets.map((a) => a.path));
        for (const bank of manifest.termBanks) {
          let count = 0;
          await streamJsonArray<unknown>(new File(directory, bank.path), async (raw) => {
            try {
              validateEntry(raw, assets);
            } catch (error) {
              throw new Error(`${bank.path}, entry ${count}: ${String(error)}`);
            }
            const [expression, reading, tags, rules, score, definitions, sequence, termTags] = raw;
            await statement.executeAsync([
              index.title,
              expression,
              reading,
              tags,
              rules,
              score,
              JSON.stringify(definitions),
              sequence,
              termTags,
            ]);
            count++;
          });
          if (count !== bank.entries) throw new Error(`Entry count mismatch in ${bank.path}`);
        }
      } finally {
        await statement.finalizeAsync();
      }
      stage.move(destination);
      promoted = true;
    });
  } catch (error) {
    if (promoted && destination.exists) destination.delete();
    throw error;
  } finally {
    // move() updates the Directory instance's URI; don't delete promoted assets.
    if (!promoted && stage.exists) stage.delete();
  }
  setDictionaryStyles(index.title, css);
}

export async function streamJsonArray<T>(
  file: File,
  onEntry: (entry: T) => Promise<void>
): Promise<void> {
  const parser = new JSONParser({ paths: ['$.*'], keepStack: false });
  const entries: T[] = [];
  parser.onValue = ({ value }) => {
    entries.push(value as T);
  };
  // Require an array root, not an object that happens to contain term-like values.
  let rootChecked = false;
  const decoder = new TextDecoder();
  const reader = file.stream().getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!rootChecked) {
        const prefix = decoder.decode(value, { stream: true }).trimStart();
        if (prefix) {
          if (prefix[0] !== '[') throw new Error(`Expected array in ${file.name}`);
          rootChecked = true;
        }
      }
      parser.write(value);
      for (const entry of entries) await onEntry(entry);
      entries.length = 0;
    }
    if (!rootChecked) throw new Error(`Empty bank: ${file.name}`);
    if (!parser.isEnded) parser.end();
    for (const entry of entries) await onEntry(entry);
  } finally {
    reader.releaseLock();
  }
}
