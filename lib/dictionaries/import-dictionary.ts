import { Directory, File } from 'expo-file-system';
import { parseManifest } from './manifest';
import { compileCSS } from './css';
import { dictionaryDirectory } from './assets';
import { insertDictionaryQuery } from '@/db/features/dictionaries/dictionaries.queries';
import { DictionaryIndex } from './dictionary-index';

/** Install a selected bundle folder without modifying its prebuilt terms database. */
export async function importDictionary(uri: string) {
  const directory = new Directory(uri);
  if (!directory.exists) throw new Error('Specified dictionary directory does not exist');

  const manifest = parseManifest(JSON.parse(await new File(directory, 'manifest.json').text()));
  const index = JSON.parse(await new File(directory, 'index.json').text()) as DictionaryIndex;
  if (
    !index ||
    typeof index.title !== 'string' ||
    !index.title.trim() ||
    typeof index.revision !== 'string' ||
    (index.format ?? index.version) !== 3
  )
    throw new Error('Invalid dictionary index');

  for (const path of [
    manifest.database.path,
    ...(manifest.styles ? [manifest.styles] : []),
    ...manifest.assets.map((a) => a.path),
    ...manifest.supportingFiles,
  ]) {
    if (!new File(directory, path).exists) throw new Error(`Missing dictionary file: ${path}`);
  }

  const css = manifest.styles ? await new File(directory, manifest.styles).text() : '';
  compileCSS(css); // verifying it's valid

  const destination = dictionaryDirectory(index.title);
  if (destination.exists) {
    console.log("DICT", destination.uri)
    throw new Error(`Dictionary "${index.title}" already exists`);
  }

  destination.parentDirectory.create({ intermediates: true, idempotent: true });

  try {
    directory.copy(destination);
    await insertDictionaryQuery({
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
    });
  } catch (error) {
    if (destination.exists) {
      destination.delete();
    }
    throw error;
  }

  return index;
}
