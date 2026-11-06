export const DICTIONARY_SQLITE_FILE_NAME = 'term_bank.db';

export interface DictionaryManifest {
  schemaVersion: 1;
  format: 'mobile-mining-app-sqlite';
  converterVersion: string;
  database: { path: typeof DICTIONARY_SQLITE_FILE_NAME; schemaVersion: 1 };
  definitionsFormat: 'react-native-component-tree';
  definitionsSchemaVersion: 1;
  entries: number;
  sourceBanks: number;
  styles: string | null;
  assets: { sourcePath: string; path: string }[];
  supportingFiles: string[];
}

export function safeDictionaryPath(path: unknown): path is string {
  return (
    typeof path === 'string' &&
    path.length > 0 &&
    !/[\\\u0000?#:]/u.test(path) &&
    path.split('/').every((part) => part !== '' && part !== '.' && part !== '..')
  );
}

export function parseManifest(value: unknown): DictionaryManifest {
  if (!value || typeof value !== 'object') throw new Error('Missing dictionary bundle manifest');
  const m = value as DictionaryManifest;
  const count = (n: unknown) => Number.isSafeInteger(n) && Number(n) >= 0;
  if (
    m.schemaVersion !== 1 ||
    m.format !== 'mobile-mining-app-sqlite' ||
    m.database?.schemaVersion !== 1 ||
    m.definitionsFormat !== 'react-native-component-tree' ||
    m.definitionsSchemaVersion !== 1
  )
    throw new Error('Unsupported dictionary bundle format; expected a prebuilt SQLite dictionary');
  if (
    typeof m.converterVersion !== 'string' ||
    m.database.path !== DICTIONARY_SQLITE_FILE_NAME ||
    !count(m.entries) ||
    !count(m.sourceBanks) ||
    m.sourceBanks < 1 ||
    (m.styles !== null && !safeDictionaryPath(m.styles)) ||
    !Array.isArray(m.assets) ||
    m.assets.some((a) => !a || !safeDictionaryPath(a.path) || !safeDictionaryPath(a.sourcePath)) ||
    !Array.isArray(m.supportingFiles) ||
    !m.supportingFiles.every(safeDictionaryPath)
  ) {
    throw new Error('Invalid dictionary manifest');
  }
  const paths = [
    'index.json',
    'manifest.json',
    m.database.path,
    ...(m.styles ? [m.styles] : []),
    ...m.assets.map((a) => a.path),
    ...m.supportingFiles,
  ];
  if (new Set(paths).size !== paths.length) throw new Error('Inconsistent dictionary manifest');
  return m;
}
