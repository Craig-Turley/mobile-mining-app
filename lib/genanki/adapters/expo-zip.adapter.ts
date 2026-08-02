import { PackageZip } from 'genanki-ts';
import JSZip from 'jszip';

export type ExpoPackageZip = PackageZip<Uint8Array, 'uint8array'>;
export function createExpoZipAdapter(): ExpoPackageZip {
  const zip = new JSZip();

  return {
    file(name, data) {
      zip.file(name, data);
    },

    async generateAsync(options) {
      return zip.generateAsync({
        type: options.type,
        mimeType: options.mimeType,
      });
    },
  };
}
