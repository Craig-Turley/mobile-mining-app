import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import {
  copyFileSync,
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
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import * as cssTree from 'css-tree';
import * as cssSelect from 'css-select';
import { Element, Document } from 'domhandler';
import SQLite from 'better-sqlite3';
import JSZip from 'jszip';

const require = createRequire(import.meta.url);
const project = fileURLToPath(new URL('../../', import.meta.url));

function runtime() {
  const root = mkdtempSync(join(tmpdir(), 'anki-export-'));
  const cache = new Map();
  const databases = new Map();
  const deletedDatabases = [];
  const path = (value) =>
    value instanceof File || value instanceof Directory
      ? value.path
      : value.startsWith('file:')
        ? fileURLToPath(value)
        : value;
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
    delete() {
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
    get parentDirectory() {
      return new Directory(dirname(this.path));
    }
    create() {
      this.parentDirectory.create();
      writeFileSync(this.path, '');
    }
    write(value) {
      writeFileSync(this.path, value);
    }
    async bytes() {
      return readFileSync(this.path);
    }
    copy(destination) {
      copyFileSync(this.path, destination.path);
    }
    delete() {
      rmSync(this.path);
    }
  }
  const fs = {
    File,
    Directory,
    Paths: { cache: join(root, 'cache'), document: join(root, 'documents') },
  };
  function bridge(db) {
    const result = (value) => ({
      changes: value.changes,
      lastInsertRowId: Number(value.lastInsertRowid),
    });
    return {
      runAsync: async (sql, ...values) =>
        result(db.prepare(sql).run(...(Array.isArray(values[0]) ? values[0] : values))),
      getAllAsync: async (sql) => db.prepare(sql).all(),
      execAsync: async (sql) => {
        db.exec(sql);
      },
      prepareAsync: async (sql) => {
        const statement = db.prepare(sql);
        return {
          executeAsync: async (values) => result(statement.run(...values)),
          finalizeAsync: async () => {},
        };
      },
      serializeAsync: async () => db.serialize(),
      closeAsync: async () => {
        db.close();
      },
    };
  }
  const overrides = {
    'expo-file-system': fs,
    'expo-sqlite': {
      openDatabaseSync(name) {
        const db = new SQLite(':memory:');
        databases.set(name, db);
        return bridge(db);
      },
      async deleteDatabaseAsync(name) {
        assert.equal(databases.get(name).open, false);
        databases.delete(name);
        deletedDatabases.push(name);
      },
    },
  };
  // Load TypeScript directly so the package's source can be exercised without building or editing it.
  function load(filename) {
    const absolute = filename.startsWith(project) ? filename : join(project, filename);
    const resolved = [
      absolute,
      absolute.replace(/\.js$/u, '.ts'),
      `${absolute}.ts`,
      `${absolute}.tsx`,
      join(absolute, 'index.ts'),
    ].find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
    if (!resolved) throw new Error(`Cannot load ${filename}`);
    if (cache.has(resolved)) return cache.get(resolved).exports;
    const module = { exports: {} };
    cache.set(resolved, module);
    const output = ts.transpileModule(readFileSync(resolved, 'utf8'), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText;
    new vm.Script(`(function(require, module, exports) { ${output}\n})`, {
      filename: resolved,
    }).runInThisContext()(
      (name) => {
        if (overrides[name]) return overrides[name];
        if (name === 'genanki-ts') return load('packages/genanki-ts/src/index.ts');
        if (name.startsWith('@/')) return load(name.slice(2));
        if (name.startsWith('.')) return load(join(dirname(resolved), name));
        return require(name);
      },
      module,
      module.exports
    );
    return module.exports;
  }
  return {
    root,
    load,
    fs,
    overrides,
    bridge,
    databases,
    deletedDatabases,
    asset(dictionary, filename, bytes) {
      const directory = load('lib/dictionaries/assets.ts').dictionaryAssetDirectory(dictionary);
      const file = new File(directory, `assets/${filename}`);
      file.parentDirectory.create();
      file.write(bytes);
    },
    dispose() {
      for (const db of databases.values()) if (db.open) db.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

const node = (component, children = [], source, props = {}) => ({
  component,
  props,
  children,
  ...(source ? { source } : {}),
});
const text = (value) => node('Text', [value]);
function entry(id = 1, dictionary = 'Dictionary') {
  return {
    id,
    dictionary,
    expression: `word-${id}`,
    reading: '',
    definition_tags: null,
    rules: 'v1',
    score: 2,
    sequence: id,
    term_tags: 'common',
    definitions_json: JSON.stringify([{ type: 'content', children: [text(`definition-${id}`)] }]),
  };
}
function storedModel(rt, names = ['expression', 'reading', 'glossary']) {
  const { Model } = rt.load('packages/genanki-ts/src/index.ts');
  return {
    applicationId: 7,
    model: new Model({
      id: 1700000001,
      name: 'Test model',
      flds: names.map((name) => ({ name })),
      tmpls: [
        {
          name: 'Card',
          qfmt: '{{expression}}',
          afmt: '{{FrontSide}}<div class="glossary">{{glossary}}</div>',
        },
      ],
      css: '.card{color:black}',
      req: [[0, 'all', [0]]],
    }),
    modelFormData: {
      id: 1700000001,
      name: 'Test model',
      fields: names.map((name) => ({ name })),
      templates: [
        {
          id: '1',
          name: 'Card',
          frontFields: ['expression'],
          backFields: [names.at(-1)],
          rule: { mode: 'all', fields: ['expression'] },
        },
      ],
    },
  };
}
const queued = (value) => ({ applicationId: value.id, modelApplicationId: 7, entry: value });

test('glossary reconstructs source HTML, ruby, tables, attributes and inline CSS without native wrappers', async () => {
  const rt = runtime();
  try {
    const value = entry();
    value.definitions_json = JSON.stringify([
      {
        type: 'content',
        children: [
          node(
            'View',
            [
              text('before <&> '),
              node('Text', ['tag'], {
                tag: 'span',
                data: { class: 'tag' },
                title: 'a"b',
                style: {
                  marginLeft: 0.5,
                  fontWeight: 'bold',
                  textDecorationLine: ['underline', 'line-through'],
                },
              }),
              node(
                'Ruby',
                [
                  text('漢'),
                  node('RubyFallback', [text('(')], { tag: 'rp' }),
                  node('RubyText', [text('かん')], { tag: 'rt' }),
                  node('RubyFallback', [text(')')], { tag: 'rp' }),
                ],
                { tag: 'ruby' }
              ),
              node(
                'Table',
                [
                  node(
                    'TableRow',
                    [node('TableCell', [], { tag: 'td' }, { colSpan: 2, rowSpan: 3 })],
                    { tag: 'tr' }
                  ),
                ],
                { tag: 'table' }
              ),
              node(
                'Details',
                [node('Summary', [text('Summary')], { tag: 'summary' }), text('details')],
                { tag: 'details' },
                { open: true }
              ),
              node('LineBreak', [], { tag: 'br' }),
            ],
            { tag: 'div' }
          ),
        ],
      },
      { type: 'content', children: [text('line 1\n  line 2')] },
      { type: 'deinflection', term: 'hidden', rules: [] },
    ]);
    const html = await rt
      .load('lib/entry/entry-glossary.ts')
      .entryToGlossaryHtml(
        value,
        'td:empty::before{content:"△"} span[data-sc-class="tag"]{color:brown}',
        async () => {
          throw new Error('Unexpected image');
        }
      );
    assert.ok(html.includes('before &lt;&amp;&gt; <span'));
    assert.ok(html.includes('data-sc-class="tag"'));
    assert.ok(html.includes('title="a&quot;b"'));
    assert.ok(html.includes('margin-left:0.5em'));
    assert.ok(html.includes('text-decoration-line:underline line-through'));
    assert.ok(html.includes('<ruby class="gloss-sc-ruby">漢<rp'));
    assert.ok(html.includes('<rt class="gloss-sc-rt">かん</rt>'));
    assert.ok(html.includes('colspan="2" rowspan="3"'));
    assert.ok(html.includes('<details class="gloss-sc-details" open>'));
    assert.ok(html.includes('white-space:pre-wrap">line 1\n  line 2'));
    assert.ok(html.includes('content:"△"'));
    assert.ok(!html.includes('hidden'));
    assert.ok(!html.includes('component'));
    const unsafe = entry();
    unsafe.definitions_json = JSON.stringify([
      {
        type: 'content',
        children: [node('Link', [text('bad')], { tag: 'a' }, { href: 'javascript:alert(1)' })],
      },
    ]);
    await assert.rejects(
      rt.load('lib/entry/entry-glossary.ts').entryToGlossaryHtml(unsafe, '', async () => ''),
      /Unsupported glossary link/u
    );
  } finally {
    rt.dispose();
  }
});

test('scoped CSS cannot style another glossary or the surrounding card and preserves browser conditions', async () => {
  const rt = runtime();
  try {
    const scopeCss = rt.load('lib/entry/dictionary-css.ts').scopeDictionaryCss;
    const css = await scopeCss(
      'span{color:red} body{color:blue} body+span{color:orange} :root{--tone:green} @media(width<=400px){span::before{content:"</style><script>bad</script>"}} div{& span{font-weight:bold}}',
      'one',
      async () => 'image.png'
    );
    assert.ok(css.includes('width<=400px'));
    assert.ok(!css.includes('</style>'));
    assert.ok(css.includes('\\3c /style>'));
    assert.ok(!css.includes('& span'));
    const document = new Document([]);
    const html = new Element('html', {}),
      body = new Element('body', {});
    function append(parent, child) {
      const previous = parent.children.at(-1);
      child.prev = previous ?? null;
      if (previous) previous.next = child;
      child.parent = parent;
      parent.children.push(child);
      return child;
    }
    append(document, html);
    append(html, body);
    const a = append(body, new Element('section', { class: 'one' }));
    const b = append(body, new Element('section', { class: 'two' }));
    const inside = append(a, new Element('span', {}));
    const other = append(b, new Element('span', {}));
    const expression = append(body, new Element('span', { class: 'expression' }));
    let matches = 0;
    cssTree.walk(cssTree.parse(css), (rule) => {
      if (rule.type !== 'Rule' || rule.prelude.type !== 'SelectorList') return;
      rule.prelude.children.forEach((selector) => {
        const text = cssTree.generate(selector);
        if (text.includes('::')) return;
        const match = cssSelect.compile(text);
        if (match(inside)) matches++;
        assert.equal(match(other), false, text);
        assert.equal(match(expression), false, text);
      });
    });
    assert.ok(matches > 0);
    const fonts = await scopeCss(
      '@font-face{font-family:"Gloss";src:url(font.woff)} @keyframes pulse{to{opacity:.5}} span{font-family:"Gloss";animation:pulse 1s}',
      'one',
      async () => 'font-export.woff'
    );
    assert.ok(fonts.includes('one-Gloss'));
    assert.ok(fonts.includes('@keyframes one-pulse'));
    assert.ok(fonts.includes('animation:one-pulse 1s'));
    const roots = await scopeCss(
      'body::before{content:"header"} body{& span{color:purple}}',
      'one',
      async () => ''
    );
    assert.ok(roots.includes('body :where(.one)::before'));
    assert.ok(roots.includes(':is(body) :where(.one) span'));
  } finally {
    rt.dispose();
  }
});

test('queue preparation and the real package writer export scoped glossary CSS and deduplicated dictionary images', async () => {
  const rt = runtime();
  let media;
  try {
    const image = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=',
      'base64'
    );
    rt.asset('First', 'images/picture.png', image);
    rt.asset('Second', 'images/picture.png', Buffer.concat([image, Buffer.from('different')]));
    const first = entry(1, 'First'),
      second = entry(2, 'Second');
    first.expression = '<猫 & 犬>';
    for (const value of [first, second])
      value.definitions_json = JSON.stringify([
        {
          type: 'content',
          children: [
            node('Text', ['image'], { tag: 'span' }),
            node(
              'DictionaryImage',
              [],
              { tag: 'img' },
              { assetPath: 'assets/images/picture.png', width: 64, height: 32, alt: 'diagram' }
            ),
          ],
        },
      ]);
    media = rt.load('features/queue/lib/glossary-media.ts').createGlossaryMedia();
    const notes = await rt.load('features/queue/lib/prepare-anki-notes.ts').prepareAnkiNotes(
      [queued(first), queued(second), queued({ ...first, id: 3 })],
      [storedModel(rt)],
      [
        { title: 'First', css: 'span{color:red;background-image:url(images/picture.png)}' },
        { title: 'Second', css: 'span{color:blue}' },
      ],
      media.resolve
    );
    assert.equal(notes[0].model, notes[1].model);
    assert.equal(notes[0].fields.expression, '&lt;猫 &amp; 犬&gt;');
    assert.equal(notes[0].fields.reading, '');
    assert.equal(notes[0].fields.glossary.files.length, 1);
    assert.equal(notes[2].fields.glossary.files.length, 0);
    const deck = rt
      .load('lib/genanki/anki-deck-builder.ts')
      .prepareDeckForExport({ id: 1700000002, name: 'Export test' }, notes);
    const uri = await rt.load('lib/genanki/anki-export.ts').exportToAnki(deck);
    const zip = await JSZip.loadAsync(readFileSync(fileURLToPath(uri)));
    const inventory = JSON.parse(await zip.file('media').async('string'));
    assert.equal(Object.keys(inventory).length, 2);
    assert.equal(new Set(Object.values(inventory)).size, 2);
    const database = new SQLite(await zip.file('collection.anki21').async('nodebuffer'));
    try {
      const rows = database.prepare('SELECT flds FROM notes ORDER BY id').all();
      assert.equal(rows.length, 3);
      const glossary = rows[0].flds.split('\x1f')[2];
      assert.ok(glossary.includes('<style>'));
      assert.ok(glossary.includes('color:red'));
      assert.ok(!glossary.includes('file:'));
      assert.ok(glossary.includes('width:64px;height:32px'));
      for (const filename of Object.values(inventory))
        assert.ok(rows.some((row) => row.flds.includes(filename)));
      for (const index of Object.keys(inventory))
        assert.ok((await zip.file(index).async('nodebuffer')).length > 0);
      const models = JSON.parse(database.prepare('SELECT models FROM col').get().models);
      assert.equal(Object.keys(models).length, 1);
      assert.ok(!models['1700000001'].css.includes('color:red'));
      assert.equal(database.prepare('SELECT count(*) AS n FROM cards').get().n, 3);
    } finally {
      database.close();
    }
    assert.equal(rt.databases.size, 0);
    assert.equal(rt.deletedDatabases.length, 1);
  } finally {
    media?.dispose();
    rt.dispose();
  }
});

test('Anki driver accepts unrelated model fields and cleans up databases on failed exports', async () => {
  const rt = runtime();
  try {
    const { Model } = rt.load('packages/genanki-ts/src/index.ts');
    const model = new Model({
      id: 1700000090,
      name: 'Unrelated',
      flds: [{ name: 'Question' }, { name: 'Answer' }],
      tmpls: [{ name: 'Card', qfmt: '{{Question}}', afmt: '{{Answer}}' }],
      req: [[0, 'all', [0]]],
    });
    const builder = rt.load('lib/genanki/anki-deck-builder.ts').prepareDeckForExport;
    const deck = builder({ id: 1700000091, name: 'Generic' }, [
      { model, fields: { Question: 'Why?', Answer: 'Because.' }, tags: ['test'] },
    ]);
    assert.deepEqual(deck.notes[0].fieldValues, ['Why?', 'Because.']);
    assert.deepEqual(deck.notes[0].tags, ['test']);
    await rt.load('lib/genanki/anki-export.ts').exportToAnki(deck);
    const bad = builder({ id: 1700000092, name: 'Failure' }, [
      {
        model,
        fields: {
          Question: 'Missing file',
          Answer: {
            markup: '<img src="missing.png">',
            files: [{ uri: 'file:///missing-image.png' }],
          },
        },
      },
    ]);
    await assert.rejects(rt.load('lib/genanki/anki-export.ts').exportToAnki(bad), /ENOENT/u);
    assert.equal(rt.databases.size, 0);
    assert.equal(rt.deletedDatabases.length, 2);
  } finally {
    rt.dispose();
  }
});

test('pre-release cleanup removes legacy queue JSON and renames model fields without changing IDs or ordinals', async () => {
  const rt = runtime();
  const db = new SQLite(':memory:');
  try {
    db.exec(
      'CREATE TABLE queue (entry TEXT); CREATE TABLE models (application_id INTEGER, model TEXT, modelFormData TEXT)'
    );
    const legacy = storedModel(rt, ['expression', 'reading', 'meaning']);
    legacy.model.tmpls[0].afmt =
      '{{FrontSide}}<div class="meaning">{{#meaning}}{{text:meaning}}{{/meaning}}</div>';
    legacy.model.css = '.meaning{color:red}.other{content:"meaning"}';
    db.prepare('INSERT INTO models VALUES (?, ?, ?)').run(
      7,
      JSON.stringify(legacy.model),
      JSON.stringify(legacy.modelFormData)
    );
    for (const value of [
      [{ type: 'content', children: [] }],
      { kanji: [], kana: [], sense: [] },
      entry(),
    ])
      db.prepare('INSERT INTO queue VALUES (?)').run(JSON.stringify(value));
    const bridge = rt.bridge(db);
    rt.overrides['@/db/app/client'] = {
      appDb: {
        $client: {
          withExclusiveTransactionAsync: async (fn) => {
            db.exec('BEGIN');
            try {
              await fn(bridge);
              db.exec('COMMIT');
            } catch (error) {
              db.exec('ROLLBACK');
              throw error;
            }
          },
        },
      },
    };
    const upgrade = rt.load('db/lib/upgrade-anki-data.ts').upgradeAnkiData;
    await upgrade();
    await upgrade();
    assert.equal(db.prepare('SELECT count(*) AS n FROM queue').get().n, 1);
    const row = db.prepare('SELECT * FROM models').get();
    const model = JSON.parse(row.model),
      form = JSON.parse(row.modelFormData);
    assert.equal(model.id, 1700000001);
    assert.deepEqual(
      model.flds.map((field) => field.name),
      ['expression', 'reading', 'glossary']
    );
    assert.deepEqual(
      model.flds.map((field) => field.ord),
      [0, 1, 2]
    );
    assert.deepEqual(model.req, [[0, 'all', [0]]]);
    assert.ok(model.tmpls[0].afmt.includes('{{FrontSide}}'));
    assert.ok(model.tmpls[0].afmt.includes('{{text:glossary}}'));
    assert.ok(model.tmpls[0].afmt.includes('class="glossary"'));
    assert.ok(model.css.includes('.glossary{color:red}'));
    assert.deepEqual(form.templates[0].backFields, ['glossary']);
  } finally {
    db.close();
    rt.dispose();
  }
});

test('new models expose expression, reading and glossary while keeping FrontSide as a template token', () => {
  const rt = runtime();
  try {
    const settings = rt.load('lib/anki-settings/index.ts');
    assert.deepEqual(
      settings.ModelFields.map((field) => field.name),
      ['expression', 'reading', 'glossary']
    );
    const model = settings.formDataToModel({
      id: 1700000030,
      name: 'New',
      fields: settings.ModelFields,
      templates: [
        {
          name: 'Card',
          frontFields: ['expression'],
          backFields: ['FrontSide', 'glossary'],
          rule: { mode: 'all', fields: ['glossary'] },
        },
      ],
    });
    assert.equal(model.flds.length, 3);
    assert.ok(model.tmpls[0].afmt.includes('{{FrontSide}}'));
    assert.ok(model.tmpls[0].afmt.includes('{{glossary}}'));
    assert.deepEqual(model.req, [[0, 'all', [2]]]);
  } finally {
    rt.dispose();
  }
});

test('missing dictionaries and image assets produce entry-specific export errors', async () => {
  const rt = runtime();
  let media;
  try {
    const prepare = rt.load('features/queue/lib/prepare-anki-notes.ts').prepareAnkiNotes;
    const value = entry();
    await assert.rejects(
      prepare([queued(value)], [storedModel(rt)], [], async () => ''),
      /word-1.*Dictionary.*not installed/u
    );
    value.definitions_json = JSON.stringify([
      {
        type: 'content',
        children: [
          node('DictionaryImage', [], { tag: 'img' }, { assetPath: 'assets/missing.png' }),
        ],
      },
    ]);
    media = rt.load('features/queue/lib/glossary-media.ts').createGlossaryMedia();
    await assert.rejects(
      prepare(
        [queued(value)],
        [storedModel(rt)],
        [{ title: value.dictionary, css: '' }],
        media.resolve
      ),
      /word-1.*Missing dictionary asset: assets\/missing.png/u
    );
  } finally {
    media?.dispose();
    rt.dispose();
  }
});

test(
  'real transformed dictionary entries export with their complete stylesheet and referenced assets',
  { skip: !process.env.ANKI_TEST_DICTIONARY },
  async () => {
    const rt = runtime();
    let media;
    try {
      const directory = process.env.ANKI_TEST_DICTIONARY;
      const bank = JSON.parse(readFileSync(join(directory, 'term_bank_1.json'), 'utf8')).slice(
        0,
        8
      );
      const css = readFileSync(join(directory, 'styles.css'), 'utf8');
      const entries = bank.map((raw, index) => {
        const value = Array.isArray(raw)
          ? {
              expression: raw[0],
              reading: raw[1],
              definitionTags: raw[2],
              rules: raw[3],
              score: raw[4],
              definitions: raw[5],
              sequence: raw[6],
              termTags: raw[7],
            }
          : raw;
        return {
          id: index + 1,
          dictionary: 'Jitendex sample',
          expression: value.expression ?? value.term,
          reading: value.reading,
          definition_tags: value.definitionTags,
          rules: value.rules,
          score: value.score,
          sequence: value.sequence,
          term_tags: value.termTags,
          definitions_json: JSON.stringify(value.definitions),
        };
      });
      media = rt.load('features/queue/lib/glossary-media.ts').createGlossaryMedia();
      const notes = await rt
        .load('features/queue/lib/prepare-anki-notes.ts')
        .prepareAnkiNotes(
          entries.map(queued),
          [storedModel(rt)],
          [{ title: 'Jitendex sample', css }],
          async (value, path, source) => {
            const asset = source === 'transformed' ? path : `assets/${path}`;
            rt.asset(value.dictionary, asset.slice(7), readFileSync(join(directory, asset)));
            return media.resolve(value, path, source);
          }
        );
      assert.equal(notes.length, 8);
      for (const note of notes) {
        assert.ok(note.fields.glossary.markup.includes('<style>'));
        assert.ok(note.fields.glossary.markup.includes('data-sc-'));
        assert.ok(!note.fields.glossary.markup.includes('"component"'));
      }
      const deck = rt
        .load('lib/genanki/anki-deck-builder.ts')
        .prepareDeckForExport({ id: 1700000010, name: 'Jitendex' }, notes);
      const uri = await rt.load('lib/genanki/anki-export.ts').exportToAnki(deck);
      const zip = await JSZip.loadAsync(readFileSync(fileURLToPath(uri)));
      const database = new SQLite(await zip.file('collection.anki21').async('nodebuffer'));
      try {
        assert.equal(database.prepare('SELECT count(*) AS n FROM notes').get().n, 8);
      } finally {
        database.close();
      }
    } finally {
      media?.dispose();
      rt.dispose();
    }
  }
);
