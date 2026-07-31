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
import { AllowedModelField, ModelFieldName } from './flash-card';
import { StoredDeck, StoredModel, StoredQueueItem } from '@/db/app/schema';
import { Entry } from './entry';

const TEMPORARY_EXPORT_DB_NAME = 'temp.db';
const TEMPORARY_ANKI_EXPORT_PATH = 'ANKI_APKG_TEMP';

// const m = new Model<AllowedModelField[]>({
//   name: "Test",
//   id: 123456789,
//   flds: [{ name: 'expression' }, { name: 'reading' }],
//   tmpls: [{ name: "Card 1", qfmt: "{{Front}}", afmt: "{{FrontSide}}\n\n<hr id=answer>\n\n{{Back}}" }],
//   req: [[0, "all", [0]]],
// });
//
// const d = new Deck(1276438724687, "Test Deck");
// d.addNote(m.note({ expression: "Please", meaning: "work" }))

export function prepareDeckForExport(
  storedDeck: StoredDeck,
  storedModels: StoredModel[],
  storedCard: StoredQueueItem[]
): Deck<AllowedModelField[]> {
  const deck = new Deck<AllowedModelField[]>(
    storedDeck.deck.id,
    storedDeck.deck.name,
    storedDeck.deck.description
  );

  const modelMap = new Map<number, Model<AllowedModelField[]>>();
  storedModels.forEach((sm) => modelMap.set(sm.applicationId, sm.model));

  storedCard.forEach((sc) => {
    const m = modelMap.get(sc.modelApplicationId);
    if (m == undefined) throw new Error('Queued card corresponds to unexisting model');
    deck.addNote(m.note(entryToNoteFields(sc.entry, m)));
  });

  return deck;
}

function entryToNoteFields(
  entry: Entry,
  model: Model<AllowedModelField[]>
): Record<string, string> {
  const noteFields: Record<string, string> = {};

  for (const field of model.flds) {
    const fieldName = field.name;

    if (fieldName === 'FrontSide') {
      continue;
    }

    const mapper = entryToModelMap[fieldName];
    noteFields[fieldName] = mapper(entry);
  }

  return noteFields;
}

type MappableModelFieldName = Exclude<ModelFieldName, 'FrontSide'>;

type EntryToFieldName = (entry: Entry) => string;

type EntryToModelMap = Record<MappableModelFieldName, EntryToFieldName>;

export const entryToModelMap = {
  expression: (entry) => entry.kanji.map((item) => item.text).join(', '),

  reading: (entry) => entry.kana.map((item) => item.text).join(', '),

  meaning: (entry) =>
    entry.sense
      .flatMap((sense) => sense.gloss)
      .map((gloss) => gloss.text)
      .join(', '),
} satisfies EntryToModelMap;

export async function exportToAnki(deck: Deck<AllowedModelField[]>): Promise<string> {
  const tmpDb = SQLite.openDatabaseSync(TEMPORARY_EXPORT_DB_NAME);

  const directory = new Directory(Paths.document, TEMPORARY_ANKI_EXPORT_PATH);

  if (!directory.exists) {
    directory.create({
      intermediates: true,
      idempotent: true,
    });
  }

  const pkg = new Package(
    createExpoDatabaseAdapter(tmpDb),
    createExpoZipAdapter(),
    createExpoReaderAdapter(),
    createExpoSaveAsAdapter({
      directory: directory,
      overwrite: true,
    })
  );

  pkg.addDeck(deck);

  const outputFile = 'deck.apkg';
  await pkg.writeToFile(outputFile);
  await SQLite.deleteDatabaseAsync(TEMPORARY_EXPORT_DB_NAME);

  return new File(directory, outputFile).uri;
}

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

export function generateDeckId(): number {
  return (1 << 30) + Math.floor(Math.random() * (1 << 30));
}
