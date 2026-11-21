import { Directory, File, Paths } from 'expo-file-system';
import { copyAsync } from 'expo-file-system/legacy';
import { listContents, unzip } from 'react-native-zip-archive';
import { parseManifest, safeDictionaryPath } from './manifest';
import { compileCSS } from './css';
import { dictionaryDirectory } from './assets';
import {
  getDictionariesQuery,
  insertDictionaryQuery,
} from '@/db/features/dictionaries/dictionaries.queries';
import { DictionaryIndex } from './dictionary-index';

const staging = new Directory(Paths.document, 'dictionary-import');
let importing = false;

/** Run before dictionaries are attached or new imports are allowed. */
export async function cleanupDictionaryImport() {
  if (!staging.exists) return;
  const receipt = new File(staging, 'install.json');
  if (receipt.exists) {
    const { title } = JSON.parse(await receipt.text()) as { title: string };
    const installed = await getDictionariesQuery();
    if (!installed.some((dictionary) => dictionary.title === title)) {
      const destination = dictionaryDirectory(title);
      if (destination.exists) destination.delete();
    }
  }
  staging.delete();
}

/** Native extraction keeps large dictionaries out of the JavaScript heap. */
export async function importDictionary(uri: string) {
  if (importing) throw new Error('A dictionary import is already in progress');
  importing = true;
  try {
    await cleanupDictionaryImport();
    staging.create({ intermediates: true });
    const archive = new File(staging, 'dictionary.zip');
    const source = new File(uri);
    if (source.size > Paths.availableDiskSpace) {
      throw new Error('Not enough storage to copy this dictionary ZIP');
    }
    // The async copy also supports Android document-provider content:// URIs.
    await copyAsync({ from: uri, to: archive.uri });
    const archivePath = decodeURIComponent(archive.uri.replace(/^file:\/\//, ''));
    const entries = await listContents(archivePath);
    const paths = new Set<string>();
    let size = 0;
    for (const entry of entries) {
      const path = entry.isDirectory ? entry.path.replace(/\/$/, '') : entry.path;
      if (!safeDictionaryPath(path) || paths.has(path) || entry.isEncrypted) {
        throw new Error('Invalid dictionary ZIP: unsafe, duplicate or encrypted entry');
      }
      paths.add(path);
      if (!Number.isSafeInteger(entry.size) || entry.size < 0) {
        throw new Error('Invalid dictionary ZIP entry size');
      }
      size += entry.size;
    }
    const roots = ['', ...new Set(entries.map((entry) => entry.path.split('/')[0]))].filter(
      (root) => {
        if (root === '__MACOSX') return false;
        const prefix = root ? `${root}/` : '';
        return paths.has(`${prefix}manifest.json`) && paths.has(`${prefix}index.json`);
      }
    );
    if (roots.length !== 1) {
      throw new Error(
        'Expected one converted SQLite dictionary bundle at the ZIP root or inside a single folder'
      );
    }
    if (!Number.isSafeInteger(size) || size > Paths.availableDiskSpace) {
      throw new Error('Not enough storage to extract this dictionary');
    }
    const directory = new Directory(staging, 'bundle');
    directory.create();
    await unzip(archivePath, decodeURIComponent(directory.uri.replace(/^file:\/\//, '')));
    const bundle = roots[0] ? new Directory(directory, roots[0]) : directory;
    return await installDictionary(bundle.uri);
  } finally {
    try {
      await cleanupDictionaryImport();
    } finally {
      importing = false;
    }
  }
}

/** Install a staged bundle without modifying its prebuilt terms database. */
async function installDictionary(uri: string) {
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
    throw new Error(`Dictionary "${index.title}" already exists`);
  }

  destination.parentDirectory.create({ intermediates: true, idempotent: true });
  // Record intent before moving, so startup can recover a move without registration.
  const receipt = new File(staging, 'install.pending.json');
  receipt.write(JSON.stringify({ title: index.title }));
  receipt.move(new File(staging, 'install.json'));

  try {
    directory.move(destination);
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
