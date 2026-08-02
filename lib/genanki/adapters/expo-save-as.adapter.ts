import { Directory, File, Paths } from 'expo-file-system';
import type { SaveAs } from 'genanki-ts';

export interface ExpoSaveAsOptions {
  directory?: Directory;
  overwrite?: boolean;
}

export function createExpoSaveAsAdapter(options: ExpoSaveAsOptions = {}): SaveAs<Uint8Array> {
  const { directory = Paths.document, overwrite = true } = options;

  return async (data: Uint8Array, filename: string): Promise<void> => {
    const normalizedFilename = filename.endsWith('.apkg') ? filename : `${filename}.apkg`;

    const file = new File(directory, normalizedFilename);

    if (file.exists) {
      if (!overwrite) {
        throw new Error(`A file already exists at ${file.uri}`);
      }

      file.delete();
    }

    file.create({
      intermediates: true,
    });

    file.write(data);
  };
}
