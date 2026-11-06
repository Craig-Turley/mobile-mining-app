import { Directory, File, Paths } from 'expo-file-system';
import { safeDictionaryPath } from './manifest';

// Deterministic per-title storage avoids persisting sandbox-specific absolute URIs.
export function dictionaryDirectory(title: string) {
  // A bounded, URI-safe identifier also handles titles containing '.', '/', or very long text.
  let hash = 0x6c62272e07bb014262b821756295c58dn;
  for (let i = 0; i < title.length; i++) {
    hash ^= BigInt(title.charCodeAt(i));
    hash = (hash * 0x1000000000000000000013bn) & ((1n << 128n) - 1n);
  }
  return new Directory(
    Paths.document,
    'dictionaries',
    `dict-${hash.toString(16).padStart(32, '0')}`
  );
}

export function resolveDictionaryAsset(title: string, assetPath: string): string | undefined {
  if (!safeDictionaryPath(assetPath)) return undefined;
  return new File(dictionaryDirectory(title), assetPath).uri;
}

export function deleteDictionaryAssets(title: string) {
  const directory = dictionaryDirectory(title);
  if (directory.exists) directory.delete();
}
