import * as SQLite from 'expo-sqlite';
import JSZip from 'jszip';
import { Directory, File, Paths } from 'expo-file-system';
import {
  Package,
  PackageDatabase,
  PackageZip,
  Deck,
  Model,
  MediaReader,
  SaveAs,
  RequirementMode,
} from 'genanki-ts';

const css = `
.card {
  font-family: Arial, sans-serif;
  font-size: 22px;
  text-align: center;
  color: #222;
  background: #fff;
  padding: 24px;
}

.card-content {
  max-width: 700px;
  margin: 0 auto;
}

.front,
.back,
.image,
.audio {
  margin: 16px 0;
}

.front,
.back {
  font-size: 30px;
  font-weight: 600;
  line-height: 1.4;
}

.image img {
  display: block;
  max-width: 100%;
  max-height: 350px;
  width: auto;
  height: auto;
  margin: 0 auto;
  border-radius: 8px;
}

.audio {
  min-height: 24px;
}

hr#answer {
  border: 0;
  border-top: 1px solid #bbb;
  margin: 28px auto;
  max-width: 500px;
}

.nightMode .card {
  color: #eee;
  background: #222;
}

.nightMode hr#answer {
  border-top-color: #666;
}
`;

export function createExpoDatabaseAdapter(sqliteDb: SQLite.SQLiteDatabase): PackageDatabase {
  return {
    async run(sql, values = []) {
      const result = await sqliteDb.runAsync(sql, [...values] as SQLite.SQLiteBindValue[]);

      return {
        changes: result.changes,
        lastInsertRowId: result.lastInsertRowId ?? null,
      };
    },

    async prepare(sql) {
      const statement = await sqliteDb.prepareAsync(sql);

      return {
        async run(values = []) {
          const result = await statement.executeAsync([...values] as SQLite.SQLiteBindValue[]);

          return {
            changes: result.changes,
            lastInsertRowId: result.lastInsertRowId ?? null,
          };
        },

        async finalize() {
          await statement.finalizeAsync();
        },
      };
    },

    async exec(sql) {
      await sqliteDb.execAsync(sql);
    },

    async export() {
      return sqliteDb.serializeAsync();
    },

    async close() {
      await sqliteDb.closeAsync();
    },
  };
}

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

export function createExpoReaderAdapter(): MediaReader {
  return {
    async read(file) {
      return new File(file.uri).bytes();
    },
  };
}

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

export function generateModelId(): number {
  return (1 << 30) + Math.floor(Math.random() * (1 << 30));
}

// export const RequirmentModes = (typeof RequirmentMode)[number];
