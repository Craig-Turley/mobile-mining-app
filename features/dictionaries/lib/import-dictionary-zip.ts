import { Directory, File, Paths } from 'expo-file-system';
import { convert } from '@/db/lib/dictionary-to-sqlite';
import { unzipFile } from '@/lib/file-system';

function dictionaryRoot(directory: Directory): Directory {
  const candidates = [
    directory,
    ...directory
      .list()
      .filter((item): item is Directory => item instanceof Directory && item.name !== '__MACOSX'),
  ].filter(
    (candidate) =>
      new File(candidate, 'manifest.json').exists && new File(candidate, 'index.json').exists
  );

  if (candidates.length > 1) {
    throw new Error(
      'The ZIP contains multiple dictionaries. Import one transformed dictionary at a time.'
    );
  }
  if (candidates.length === 0) {
    throw new Error(
      'Expected a transformed dictionary with manifest.json and index.json at the ZIP root or inside one enclosing folder.'
    );
  }
  return candidates[0];
}

function nativePath(uri: string): string {
  return uri.startsWith('file://') ? decodeURIComponent(uri.slice(7)) : uri;
}

/** Imports and takes ownership of the document picker's cached ZIP copy. */
export async function importDictionaryZip(src: string): Promise<void> {
  const archive = new File(src);
  const temporary = new Directory(
    Paths.cache,
    `dictionary-import-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  try {
    if (!archive.exists)
      throw new Error('The selected ZIP file could not be read. Please select it again.');
    temporary.create({ intermediates: true });
    try {
      await unzipFile(nativePath(archive.uri), nativePath(temporary.uri));
    } catch (error) {
      throw new Error(
        `Could not extract dictionary ZIP: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    await convert(dictionaryRoot(temporary).uri);
  } finally {
    for (const item of [temporary, archive]) {
      try {
        if (item.exists) item.delete();
      } catch (error) {
        // Cache cleanup must not turn a committed import into a reported import failure.
        console.warn('Could not remove temporary dictionary import files:', error);
      }
    }
  }
}
