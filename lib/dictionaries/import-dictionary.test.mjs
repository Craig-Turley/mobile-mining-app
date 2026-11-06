import assert from 'node:assert/strict';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
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

const require = createRequire(import.meta.url);
const project = fileURLToPath(new URL('../../', import.meta.url));

function runtime() {
  const root = mkdtempSync(join(tmpdir(), "dictionary bundles' "));
  const registry = join(root, 'registry.db');
  const sqlite = new SQLite(registry);
  sqlite.exec(`CREATE TABLE dictionaries (id INTEGER PRIMARY KEY, title TEXT NOT NULL UNIQUE, revision TEXT NOT NULL,
    format INTEGER, version INTEGER, author TEXT, description TEXT, attribution TEXT, source_language TEXT, target_language TEXT, css TEXT)`);
  const flags = { failCopy: false };
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
      if (flags.failCopy) throw new Error('Simulated copy failure');
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
    'expo-file-system': { Directory, File, Paths: { document: join(root, 'documents') } },
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
    assert.deepEqual(await queries.lookupExpressionQuery('猫', 'ねこ'), []);
    const first = rt.bundle('First "dictionary"', 1.5),
      second = rt.bundle('Second', 10);
    for (const source of [first, second]) {
      const index = await importer.importDictionary(source.directory.uri);
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
    const matches = await queries.lookupExpressionQuery('猫', 'ねこ');
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
    await assert.rejects(importer.importDictionary(first.directory.uri), /already exists/u);
    const firstId = (await queries.getDictionariesQuery()).find(
      (row) => row.title === 'First "dictionary"'
    ).id;
    await queries.deleteDictionaryByIdQuery(firstId);
    assert.equal(assets.dictionaryDirectory('First "dictionary"').exists, false);
    assert.equal(first.directory.exists, true);
    assert.equal(cache.getDictionaryStyles('First "dictionary"').length, 0);
    assert.deepEqual(
      (await queries.lookupExpressionQuery('猫')).map((row) => row.dictionary),
      ['Second']
    );
    const remainingId = (await queries.getDictionariesQuery())[0].id;
    await queries.deleteDictionaryByIdQuery(remainingId);
    assert.deepEqual(await queries.lookupExpressionQuery('猫'), []);
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

test('missing bundle files and failed copying/registration leave the source and existing installations intact', async () => {
  for (const failure of [
    'missing-database',
    'missing-supporting',
    'legacy-format',
    'copy',
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
      if (failure === 'copy') rt.flags.failCopy = true;
      if (failure === 'registration')
        rt.sqlite.exec(
          "CREATE TRIGGER reject_registration BEFORE INSERT ON dictionaries BEGIN SELECT RAISE(ABORT, 'Simulated registration failure'); END"
        );
      await assert.rejects(
        rt.load('lib/dictionaries/import-dictionary.ts').importDictionary(source.directory.uri)
      );
      assert.equal(rt.sqlite.prepare('SELECT count(*) AS n FROM dictionaries').get().n, 0);
      assert.equal(rt.load('lib/dictionaries/assets.ts').dictionaryDirectory('Test').exists, false);
      assert.equal(source.directory.exists, true);
    } finally {
      rt.dispose();
    }
  }
});
