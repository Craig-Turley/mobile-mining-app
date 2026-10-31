export interface DictionaryManifest {
  schemaVersion: 2;
  format: 'react-native-component-tree';
  entries: number;
  termBanks: { path: string; entries: number }[];
  styles: string | null;
  assets: { sourcePath: string; path: string }[];
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
  if (!value || typeof value !== 'object')
    throw new Error('Missing transformed dictionary manifest');
  const m = value as DictionaryManifest;
  const count = (n: unknown) => Number.isSafeInteger(n) && Number(n) >= 0;
  if (m.schemaVersion !== 2 || m.format !== 'react-native-component-tree')
    throw new Error('Unsupported dictionary conversion format; transform this dictionary first');
  if (
    !count(m.entries) ||
    !Array.isArray(m.termBanks) ||
    !m.termBanks.length ||
    m.termBanks.some((b) => !b || !safeDictionaryPath(b.path) || !count(b.entries)) ||
    (m.styles !== null && !safeDictionaryPath(m.styles)) ||
    !Array.isArray(m.assets) ||
    m.assets.some((a) => !a || !safeDictionaryPath(a.path) || !safeDictionaryPath(a.sourcePath))
  ) {
    throw new Error('Invalid dictionary manifest');
  }
  const paths = [
    'index.json',
    'manifest.json',
    ...m.termBanks.map((b) => b.path),
    ...(m.styles ? [m.styles] : []),
    ...m.assets.map((a) => a.path),
  ];
  if (
    new Set(paths).size !== paths.length ||
    m.termBanks.reduce((n, b) => n + b.entries, 0) !== m.entries
  )
    throw new Error('Inconsistent dictionary manifest');
  return m;
}
