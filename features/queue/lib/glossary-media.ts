import { Directory, File, Paths } from 'expo-file-system';
import { resolveDictionaryAsset } from '@/lib/dictionaries/assets';
import { safeDictionaryPath } from '@/lib/dictionaries/manifest';
import { exportKey } from '@/lib/entry/html-utils';
import type { ResolveEntryAsset } from './prepare-anki-notes';

export function createGlossaryMedia() {
  const directory = new Directory(
    Paths.cache,
    `anki-media-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  directory.create({ intermediates: true, idempotent: true });
  const files = new Map<string, { filename: string; uri: string }>();

  const resolve: ResolveEntryAsset = async (entry, url, source) => {
    if (/^[a-z][\w+.-]*:/iu.test(url)) throw new Error(`Expected a local dictionary asset: ${url}`);

    const match = url.match(/^([^?#]+)(.*)$/u);
    if (!match) throw new Error(`Invalid dictionary asset: ${url}`);

    const path = decodeURIComponent(match[1]).replace(/^(\.\/)+/u, '');
    const assetPath = source === 'transformed' ? path : `assets/${path}`;
    if (!safeDictionaryPath(assetPath)) throw new Error(`Unsafe dictionary asset: ${url}`);

    const uri = resolveDictionaryAsset(entry.dictionary, assetPath);
    if (!uri || !new File(uri).exists) throw new Error(`Missing dictionary asset: ${url}`);

    let media = files.get(uri);
    if (!media) {
      const bytes = await new File(uri).bytes();
      const extension = path.match(/\.[a-z\d]{1,10}$/iu)?.[0].toLowerCase() ?? '';
      const filename = `dictionary-${exportKey(`${entry.dictionary}\0${assetPath}\0${exportKey(bytes)}`)}${extension}`;
      const file = new File(directory, filename);
      file.create();
      file.write(bytes);
      media = { filename, uri: file.uri };
      files.set(uri, media);
    }

    return { ...media, filename: media.filename + match[2] };
  };

  return {
    resolve,
    dispose: () => {
      if (directory.exists) directory.delete();
    },
  };
}
