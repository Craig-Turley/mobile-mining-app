import { MediaReader } from 'genanki-ts';
import { File } from 'expo-file-system';

export function createExpoReaderAdapter(): MediaReader {
  return {
    async read(file) {
      return new File(file.uri).bytes();
    },
  };
}
