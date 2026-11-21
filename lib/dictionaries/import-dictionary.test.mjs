import assert from 'node:assert/strict';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import SQLite from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import JSZip from 'jszip';

const require = createRequire(import.meta.url);
const project = fileURLToPath(new URL('../../', import.meta.url));

function runtime() {
  const root = mkdtempSync(join(tmpdir(), "dictionary bundles' "));
  const registry = join(root, 'registry.db');
  const sqlite = new SQLite(registry);
  sqlite.exec(`CREATE TABLE dictionaries (id INTEGER PRIMARY KEY, title TEXT NOT NULL UNIQUE, revision TEXT NOT NULL,
    format INTEGER, version INTEGER, author TEXT, description TEXT, attribution TEXT, source_language TEXT, target_language TEXT, css TEXT)`);
  const flags = { failCopy: false, failMove: false, failExtraction: false, entries: null };
  const modules = new Map();
  const path = (value) => {
    const uri = value.uri ?? value;
    return uri.startsWith('file:') ? fileURLToPath(uri) : uri;
  };
  class Directory {
    constructor(...parts) {
      this.path = join(...parts.map(path));
    }
    get uri() {
      return pathToFileURL(this.path).href;
    }
    get exists() {
      return existsSync(this.path);
    }
    get parentDirectory() {
      return new Directory(dirname(this.path));
    }
    create() {
      mkdirSync(this.path, { recursive: true });
    }
    copy(destination) {
      cpSync(this.path, destination.path, { recursive: true });
    }
    move(destination) {
      renameSync(this.path, destination.path);
      if (flags.failMove) throw new Error('Simulated move failure');
    }
    delete() {
      const attached = sqlite.pragma('database_list');
      assert.ok(
        !attached.some((database) => database.file.startsWith(`${this.path}/`)),
        'detach prebuilt databases before deleting their folder'
      );
      rmSync(this.path, { recursive: true });
    }
  }
  class File {
    constructor(...parts) {
      this.path = join(...parts.map(path));
    }
    get uri() {
      return pathToFileURL(this.path).href;
    }
    get exists() {
      return existsSync(this.path);
    }
    async text() {
      return readFileSync(this.path, 'utf8');
    }
    write(value) {
      writeFileSync(this.path, value);
    }
    copy(destination) {
      cpSync(this.path, destination.path);
    }
    move(destination) {
      renameSync(this.path, destination.path);
    }
  }
  function bridge(db) {
    const params = (values) =>
      values.length === 1 && Array.isArray(values[0]) ? values[0] : values;
    return {
      execAsync: async (sql) => {
        db.exec(sql);
      },
      getAllAsync: async (sql) => db.prepare(sql).all(),
      getFirstAsync: async (sql, ...values) => db.prepare(sql).get(...params(values)),
      runAsync: async (sql, ...values) => db.prepare(sql).run(...params(values)),
    };
  }
  const orm = drizzle(sqlite);
  const dictionariesDb = {
    select: (...args) => orm.select(...args),
    insert: (...args) => orm.insert(...args),
    $client: {
      ...bridge(sqlite),
      withTransactionAsync: async (fn) => {
        sqlite.exec('BEGIN');
        try {
          await fn();
          sqlite.exec('COMMIT');
        } catch (error) {
          sqlite.exec('ROLLBACK');
          throw error;
        }
      },
      withExclusiveTransactionAsync: async (fn) => {
        // Like Expo, this connection deliberately has no attached databases or temp views.
        const tx = new SQLite(registry);
        try {
          tx.exec('BEGIN');
          try {
            await fn(bridge(tx));
            tx.exec('COMMIT');
          } catch (error) {
            tx.exec('ROLLBACK');
            throw error;
          }
        } finally {
          tx.close();
        }
      },
    },
  };
  const overrides = {
    'expo-file-system': {
      Directory,
      File,
      Paths: { document: join(root, 'documents'), availableDiskSpace: Number.MAX_SAFE_INTEGER },
    },
    'expo-file-system/legacy': {
      async copyAsync({ from, to }) {
        cpSync(path(from), path(to));
        if (flags.failCopy) throw new Error('Simulated copy failure');
      },
    },
    'react-native-zip-archive': {
      async listContents(source) {
        if (flags.entries) return flags.entries;
        const zip = await JSZip.loadAsync(readFileSync(source));
        return Promise.all(
          Object.values(zip.files).map(async (entry) => ({
            path: entry.name,
            isDirectory: entry.dir,
            isEncrypted: false,
            size: entry.dir ? 0 : (await entry.async('nodebuffer')).length,
          }))
        );
      },
      async unzip(source, destination) {
        const zip = await JSZip.loadAsync(readFileSync(source));
        for (const entry of Object.values(zip.files)) {
          const target = join(destination, entry.name);
          if (entry.dir) mkdirSync(target, { recursive: true });
          else {
            mkdirSync(dirname(target), { recursive: true });
            writeFileSync(target, await entry.async('nodebuffer'));
          }
          if (flags.failExtraction) throw new Error('Simulated extraction failure');
        }
      },
    },
    '@/db/dictionaries/client': { dictionariesDb },
  };
  function load(filename) {
    const absolute = filename.startsWith(project) ? filename : join(project, filename);
    const resolved = [
      absolute,
      `${absolute}.ts`,
      `${absolute}.tsx`,
      join(absolute, 'index.ts'),
    ].find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
    if (!resolved) throw new Error(`Cannot load ${filename}`);
    if (modules.has(resolved)) return modules.get(resolved).exports;
    const module = { exports: {} };
    modules.set(resolved, module);
    const output = ts.transpileModule(readFileSync(resolved, 'utf8'), {
      fileName: resolved,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    }).outputText;
    new vm.Script(`(function(require, module, exports) { ${output}\n})`).runInThisContext()(
      (name) => {
        if (overrides[name]) return overrides[name];
        if (name.startsWith('@/')) return load(name.slice(2));
        if (name.startsWith('.')) return load(join(dirname(resolved), name));
        return require(name);
      },
      module,
      module.exports
    );
    return module.exports;
  }
  function bundle(title, score = 0) {
    const directory = new Directory(root, `source-${Math.random().toString(36).slice(2)}`);
    directory.create();
    const write = (filename, value) => {
      const file = new File(directory, filename);
      mkdirSync(dirname(file.path), { recursive: true });
      writeFileSync(file.path, value);
    };
    const manifest = {
      format: 'mobile-mining-app-sqlite',
      schemaVersion: 1,
      converterVersion: 'test',
      database: { path: 'term_bank.db', schemaVersion: 1 },
      definitionsFormat: 'react-native-component-tree',
      definitionsSchemaVersion: 1,
      entries: 1,
      sourceBanks: 1,
      styles: 'styles.css',
      assets: [{ sourcePath: 'image.png', path: 'assets/image.png' }],
      supportingFiles: ['supporting/tag_bank_1.json'],
    };
    write('manifest.json', JSON.stringify(manifest));
    write('index.json', JSON.stringify({ title, revision: '1', format: 3 }));
    write('styles.css', 'span{color:red}');
    write('assets/image.png', 'image bytes');
    write('supporting/tag_bank_1.json', '[]');
    const db = new SQLite(join(directory.path, 'term_bank.db'));
    const definitions = [
      {
        type: 'content',
        children: [{ component: 'Text', props: {}, children: [`definition from ${title}`] }],
      },
    ];
    try {
      // Fixture construction stands in for the transformer; application installation never writes terms.
      db.exec(`CREATE TABLE terms (id INTEGER PRIMARY KEY NOT NULL, dictionary TEXT NOT NULL,
        expression TEXT NOT NULL, reading TEXT NOT NULL, definition_tags TEXT, rules TEXT NOT NULL,
        score INTEGER NOT NULL, definitions_json TEXT NOT NULL, sequence INTEGER NOT NULL, term_tags TEXT NOT NULL);
        CREATE INDEX idx_entries_expression ON terms(expression);
        CREATE INDEX idx_entries_reading ON terms(reading);
        PRAGMA user_version=1; PRAGMA application_id=1296908612;`);
      db.prepare('INSERT INTO terms VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        1,
        title,
        '猫',
        'ねこ',
        null,
        '',
        score,
        JSON.stringify(definitions),
        42,
        'common'
      );
    } finally {
      db.close();
    }
    return { directory, manifest, write, definitions };
  }
  return {
    sqlite,
    flags,
    load,
    bundle,
    staging: new Directory(root, 'documents', 'dictionary-import'),
    async archive(source, prefix = '') {
      const zip = new JSZip();
      function add(directory, prefix = '') {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          const name = `${prefix}${entry.name}`;
          if (entry.isDirectory()) add(join(directory, entry.name), `${name}/`);
          else zip.file(name, readFileSync(join(directory, entry.name)));
        }
      }
      add(source.directory.path, prefix);
      if (prefix) zip.file(`__MACOSX/${prefix}._manifest.json`, 'macOS metadata');
      const file = join(root, `${Math.random()}.zip`);
      writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer' }));
      return pathToFileURL(file).href;
    },
    dispose() {
      sqlite.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

test('bundle installation preserves complete folders and queries attached terms without a main terms table', async () => {
  const rt = runtime();
  try {
    const importer = rt.load('lib/dictionaries/import-dictionary.ts');
    const actions = rt.load('db/features/dictionaries/dictionaries.actions.ts');
    const queries = rt.load('db/features/dictionaries/dictionaries.queries.ts');
    const assets = rt.load('lib/dictionaries/assets.ts');
    const cache = rt.load('lib/dictionaries/cache.ts');
    await actions.attachAndBuildViews();
    assert.deepEqual(await queries.lookupExpressionQuery(['猫', 'ねこ']), []);
    const first = rt.bundle('First "dictionary"', 1.5),
      second = rt.bundle('Second', 10);
    for (const source of [first, second]) {
      const archive = await rt.archive(source);
      const index = await importer.importDictionary(archive);
      assert.equal(rt.staging.exists, false);
      assert.equal(existsSync(fileURLToPath(archive)), true);
      const destination = assets.dictionaryDirectory(index.title);
      for (const file of [
        'term_bank.db',
        'index.json',
        'manifest.json',
        'styles.css',
        'assets/image.png',
        'supporting/tag_bank_1.json',
      ]) {
        assert.deepEqual(
          readFileSync(join(destination.path, file)),
          readFileSync(join(source.directory.path, file))
        );
      }
    }
    await actions.attachAndBuildViews();
    await actions.attachAndBuildViews(); // Rebuilding must discard old view references before detaching.
    cache.initializeCssCache(await queries.getDictionariesQuery());
    const matches = (await queries.lookupExpressionQuery(['猫', 'ねこ'])).sort(
      (a, b) => b.score - a.score
    );
    assert.deepEqual(
      matches.map((row) => row.dictionary),
      ['Second', 'First "dictionary"']
    );
    assert.deepEqual(
      matches.map((row) => row.id),
      [1, 1]
    );
    assert.equal(matches[1].score, 1.5);
    assert.equal(matches[1].definitionTags, null);
    assert.deepEqual(JSON.parse(matches[1].definitionsJson), first.definitions);
    assert.equal(
      rt.sqlite.prepare("SELECT count(*) AS n FROM main.sqlite_master WHERE name='terms'").get().n,
      0
    );
    assert.equal(cache.getDictionaryStyles('Second').length, 1);
    await assert.rejects(importer.importDictionary(await rt.archive(first)), /already exists/u);
    assert.equal(rt.staging.exists, false);
    const firstId = (await queries.getDictionariesQuery()).find(
      (row) => row.title === 'First "dictionary"'
    ).id;
    await queries.deleteDictionaryByIdQuery(firstId);
    assert.equal(assets.dictionaryDirectory('First "dictionary"').exists, false);
    assert.equal(first.directory.exists, true);
    assert.equal(cache.getDictionaryStyles('First "dictionary"').length, 0);
    assert.deepEqual(
      (await queries.lookupExpressionQuery(['猫'])).map((row) => row.dictionary),
      ['Second']
    );
    const remainingId = (await queries.getDictionariesQuery())[0].id;
    await queries.deleteDictionaryByIdQuery(remainingId);
    assert.deepEqual(await queries.lookupExpressionQuery(['猫']), []);
    assert.equal(
      rt.sqlite
        .pragma('database_list')
        .filter((database) => !['main', 'temp'].includes(database.name)).length,
      0
    );
  } finally {
    rt.dispose();
  }
});

test('invalid bundles and failed extraction/moving/registration clean staging and preserve the source', async () => {
  for (const failure of [
    'missing-database',
    'missing-supporting',
    'legacy-format',
    'copy',
    'extraction',
    'move',
    'registration',
  ]) {
    const rt = runtime();
    try {
      const source = rt.bundle('Test');
      if (failure === 'missing-database') rmSync(join(source.directory.path, 'term_bank.db'));
      if (failure === 'missing-supporting')
        rmSync(join(source.directory.path, 'supporting/tag_bank_1.json'));
      if (failure === 'legacy-format')
        source.write(
          'manifest.json',
          JSON.stringify({
            ...source.manifest,
            format: 'react-native-component-tree',
            schemaVersion: 2,
          })
        );
      if (failure === 'extraction') rt.flags.failExtraction = true;
      if (failure === 'copy') rt.flags.failCopy = true;
      if (failure === 'move') rt.flags.failMove = true;
      if (failure === 'registration')
        rt.sqlite.exec(
          "CREATE TRIGGER reject_registration BEFORE INSERT ON dictionaries BEGIN SELECT RAISE(ABORT, 'Simulated registration failure'); END"
        );
      await assert.rejects(
        rt.load('lib/dictionaries/import-dictionary.ts').importDictionary(await rt.archive(source))
      );
      assert.equal(rt.sqlite.prepare('SELECT count(*) AS n FROM dictionaries').get().n, 0);
      assert.equal(rt.load('lib/dictionaries/assets.ts').dictionaryDirectory('Test').exists, false);
      assert.equal(source.directory.exists, true);
      assert.equal(rt.staging.exists, false);
    } finally {
      rt.dispose();
    }
  }
});

test('startup removes interrupted imports and unregistered moves, but preserves registered dictionaries', async () => {
  for (const phase of ['download', 'extraction', 'receipt-write', 'move', 'registration']) {
    const rt = runtime();
    try {
      const importer = rt.load('lib/dictionaries/import-dictionary.ts');
      const source = rt.bundle('Recovery');
      const destination = rt.load('lib/dictionaries/assets.ts').dictionaryDirectory('Recovery');
      if (phase === 'registration') await importer.importDictionary(await rt.archive(source));
      rt.staging.create();
      writeFileSync(join(rt.staging.path, 'dictionary.zip'), 'partial download');
      if (phase === 'extraction') {
        cpSync(source.directory.path, join(rt.staging.path, 'bundle'), { recursive: true });
      }
      if (phase === 'receipt-write')
        writeFileSync(join(rt.staging.path, 'install.pending.json'), '{');
      if (phase === 'move' || phase === 'registration') {
        writeFileSync(join(rt.staging.path, 'install.json'), JSON.stringify({ title: 'Recovery' }));
        if (phase === 'move') {
          destination.parentDirectory.create();
          source.directory.copy(destination);
        }
      }
      await importer.cleanupDictionaryImport();
      await importer.cleanupDictionaryImport();
      assert.equal(rt.staging.exists, false);
      assert.equal(destination.exists, phase === 'registration');
      assert.equal(source.directory.exists, true);
    } finally {
      rt.dispose();
    }
  }
});

test('unsafe, duplicate, encrypted and oversized archives are rejected before extraction', async () => {
  for (const entry of [
    { path: '../escape' },
    { path: '/absolute' },
    { path: 'assets\\escape' },
    { path: 'manifest.json' },
    { path: 'encrypted', isEncrypted: true },
    { path: 'large', size: Number.MAX_SAFE_INTEGER },
  ]) {
    const rt = runtime();
    try {
      const source = rt.bundle('Unsafe');
      const base = { size: 1, isDirectory: false, isEncrypted: false };
      rt.flags.entries = [
        { ...base, path: 'manifest.json' },
        { ...base, path: 'index.json' },
        { ...base, ...entry },
      ];
      await assert.rejects(
        rt.load('lib/dictionaries/import-dictionary.ts').importDictionary(await rt.archive(source))
      );
      assert.equal(rt.staging.exists, false);
      assert.equal(
        rt.load('lib/dictionaries/assets.ts').dictionaryDirectory('Unsafe').exists,
        false
      );
    } finally {
      rt.dispose();
    }
  }
});

test('imports a bundle inside an enclosing folder alongside macOS metadata', async () => {
  const rt = runtime();
  try {
    const source = rt.bundle('Wrapped');
    const index = await rt
      .load('lib/dictionaries/import-dictionary.ts')
      .importDictionary(await rt.archive(source, 'jitendex/'));
    assert.equal(index.title, 'Wrapped');
    const destination = rt.load('lib/dictionaries/assets.ts').dictionaryDirectory('Wrapped');
    assert.deepEqual(
      readFileSync(join(destination.path, 'term_bank.db')),
      readFileSync(join(source.directory.path, 'term_bank.db'))
    );
    assert.equal(existsSync(join(destination.path, '__MACOSX')), false);
    assert.equal(rt.staging.exists, false);
  } finally {
    rt.dispose();
  }
});

test('rejects archives containing multiple possible dictionary bundles', async () => {
  const rt = runtime();
  try {
    const source = rt.bundle('Ambiguous');
    rt.flags.entries = [
      'first/manifest.json',
      'first/index.json',
      'second/manifest.json',
      'second/index.json',
    ].map((path) => ({ path, size: 1, isDirectory: false, isEncrypted: false }));
    await assert.rejects(
      rt.load('lib/dictionaries/import-dictionary.ts').importDictionary(await rt.archive(source)),
      /Expected one converted SQLite dictionary bundle/u
    );
    assert.equal(rt.staging.exists, false);
  } finally {
    rt.dispose();
  }
});
