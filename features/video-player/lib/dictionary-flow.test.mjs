import assert from 'node:assert/strict';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import ts from 'typescript';
import * as cssSelect from 'css-select';

// Run: node --test features/video-player/lib/dictionary-flow.test.mjs
// React Native hosts are stubbed: these tests verify tree structure, not device measurements.
const require = createRequire(import.meta.url);
const opened = [];
const native = {
  Text: 'Text',
  View: 'View',
  Image: 'Image',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  Linking: {
    openURL: (href) => {
      opened.push(href);
      return Promise.resolve();
    },
  },
};
function loadTsx(relative, imports = {}) {
  const source = readFileSync(new URL(relative, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const module = { exports: {} };
  const execute = new vm.Script(
    `(function(require, module, exports) { ${outputText}\n})`
  ).runInThisContext();
  execute(
    (name) => (name === 'react-native' ? native : (imports[name] ?? require(name))),
    module,
    module.exports
  );
  return module.exports;
}
const flow = loadTsx('./dictionary-flow.ts');
const diagnostics = loadTsx('../../../lib/dictionaries/diagnostics.ts');
const nativeStyle = loadTsx('../../../lib/dictionaries/native-style.ts', {
  './diagnostics': diagnostics,
});
const css = loadTsx('../../../lib/dictionaries/css.ts', {
  'css-select': cssSelect,
  './native-style': nativeStyle,
  './diagnostics': diagnostics,
});
const manifest = loadTsx('../../../lib/dictionaries/manifest.ts');
const node = (component, children = [], extra = {}) => ({
  component,
  props: {},
  children,
  ...extra,
});
const text = (value, ancestors = []) => ({ kind: 'text', text: value, ancestors });
const ruby = (base = '漢', annotation = 'かん') =>
  node('Ruby', [node('Text', [base]), node('RubyText', [node('Text', [annotation])])]);
const unitText = (unit) =>
  unit
    .filter((atom) => atom.kind === 'text')
    .map((atom) => atom.text)
    .join('');

test('adjacent strings, spans, and links share a flow while blocks split it', () => {
  const span = node('Text', ['world']);
  const link = node('Link', ['!'], { props: { href: 'https://example.com' } });
  const block = node('View', [node('Text', ['block'])]);
  const result = flow.buildFlow(['Hello ', span, link, block, 'after']);
  assert.deepEqual(
    result.map((segment) => segment.kind),
    ['inline', 'block', 'inline']
  );
  assert.equal(result[0].atoms.map((atom) => atom.text).join(''), 'Hello world!');
  assert.equal(result[0].atoms[1].ancestors[0], span);
  assert.equal(result[0].atoms[2].ancestors[0], link);
  assert.equal(result[1].node, block);
});

test('hidden and block-displayed text does not get merged into an ordinary inline run', () => {
  const hidden = node('Text', ['hidden'], { source: { tag: 'span', style: { display: 'none' } } });
  const block = node('Text', ['block'], { source: { tag: 'span', style: { display: 'block' } } });
  const result = flow.buildFlow(['before', hidden, block, 'after']);
  assert.equal(result.length, 3);
  assert.equal(result[1].kind, 'block');
  assert.equal(result[1].node, block);
});

test('ruby groups are read from source nodes, preserve annotations, and omit rp fallback', () => {
  const first = ruby().children;
  const second = ruby('字', 'じ').children;
  const groups = flow.groupRubyChildren([
    first[0],
    node('RubyFallback', ['(']),
    first[1],
    node('RubyFallback', [')']),
    ...second,
    'suffix',
  ]);
  assert.equal(groups.length, 3);
  assert.deepEqual(groups[0], { base: [first[0]], annotation: [first[1]] });
  assert.deepEqual(groups[1], { base: [second[0]], annotation: [second[1]] });
  assert.deepEqual(groups[2], { base: ['suffix'], annotation: [] });
  const atoms = flow.buildFlow([node('Ruby', [...first, ...second, 'suffix'])])[0].atoms;
  assert.deepEqual(
    atoms.map((atom) => atom.kind),
    ['ruby', 'ruby', 'text']
  );
});

test('mixed runs wrap Latin words across span boundaries without splitting ruby groups', () => {
  const styled = node('Text', [], { source: { tag: 'span', style: { fontWeight: 'bold' } } });
  const rubyAtom = flow.buildFlow([ruby()])[0].atoms[0];
  const lines = flow.wrapInlineAtoms([text('hel'), text('lo ', [styled]), rubyAtom, text('。')]);
  assert.equal(lines.length, 1);
  assert.equal(unitText(lines[0][0]), 'hello');
  assert.equal(lines[0][0][1].ancestors[0], styled);
  assert.equal(lines[0][2][0], rubyAtom);
  assert.equal(unitText(lines[0][2]), '。');
});

test('Japanese punctuation, combining characters, and emoji retain valid wrap boundaries', () => {
  assert.deepEqual(flow.splitTextForWrapping('「日本語」。'), ['「日', '本', '語」。']);
  assert.deepEqual(flow.splitTextForWrapping("don't co-operate"), ["don't", ' ', 'co-operate']);
  const emoji = '👨‍👩‍👧‍👦';
  const decomposed = 'e\u0301';
  const chunks = flow.splitTextForWrapping(`${emoji}${decomposed}漢`);
  assert.deepEqual(chunks, [emoji, decomposed, '漢']);
});

test('explicit and string line breaks preserve blank and trailing lines', () => {
  const rubyAtom = flow.buildFlow([ruby()])[0].atoms[0];
  const lines = flow.wrapInlineAtoms([
    text('before\r\n\n'),
    rubyAtom,
    { kind: 'break', ancestors: [] },
    text('after\n'),
  ]);
  assert.equal(lines.length, 5);
  assert.equal(unitText(lines[0][0]), 'before');
  assert.deepEqual(lines[1], []);
  assert.equal(lines[2][0][0], rubyAtom);
  assert.equal(unitText(lines[3][0]), 'after');
  assert.deepEqual(lines[4], []);
});

test('nonbreaking spaces bind text and ruby, and older Hermes retains emoji graphemes', () => {
  assert.deepEqual(flow.splitTextForWrapping('hello\u00a0world'), ['hello\u00a0world']);
  const atom = flow.buildFlow([ruby()])[0].atoms[0];
  const lines = flow.wrapInlineAtoms([text('a\u00a0'), atom, text('\u00a0b')]);
  assert.equal(lines[0].length, 1);
  assert.equal(lines[0][0][1], atom);
  const segmenter = Intl.Segmenter;
  try {
    Intl.Segmenter = undefined;
    assert.deepEqual(flow.splitTextForWrapping('👍🏽👨‍👩‍👧‍👦🇯🇵e\u0301'), ['👍🏽', '👨‍👩‍👧‍👦', '🇯🇵', 'e\u0301']);
  } finally {
    Intl.Segmenter = segmenter;
  }
});

const rubyComponents = loadTsx('../../../components/ui/ruby.tsx', {
  '@/utils/cn': loadTsx('../../../utils/cn.ts'),
});
const renderer = loadTsx('./render-entry-modal.tsx', {
  '@/components/ui/ruby': rubyComponents,
  './dictionary-flow': flow,
  '@/lib/dictionaries/css': css,
  '@/lib/dictionaries/native-style': nativeStyle,
});

const environment = { width: 360, height: 780, fontSize: 16, color: '#333333', dark: false };
const element = (tag, children = [], extra = {}) =>
  node(
    {
      div: 'View',
      span: 'Text',
      ul: 'List',
      li: 'ListItem',
      table: 'Table',
      tr: 'TableRow',
      td: 'TableCell',
      a: 'Link',
    }[tag] ?? 'Text',
    children,
    { source: { tag, ...extra }, props: {} }
  );
const styled = (children, stylesheet, env = environment) =>
  css.styleDictionaryTree(children, css.compileCSS(stylesheet), env);

test('cascade resolves specificity, important, inline styles and source order before flow', () => {
  const tree = styled(
    [
      element('div', [
        element('span', ['inside'], {
          id: 'target',
          class: 'word',
          style: { display: 'inline', color: 'purple' },
        }),
      ]),
    ],
    `
    div { display: inline; color: green; }
    span { display: block !important; color: red; }
    #target { color: blue; }
    .word { color: orange !important; }
    span.word { color: brown !important; }
  `
  );
  assert.equal(tree[0].computed.display, 'inline');
  assert.equal(tree[0].children[0].computed.display, 'block');
  assert.equal(tree[0].children[0].computed.text.color, '#a52a2a');
  assert.equal(flow.buildFlow(tree)[0].kind, 'block');
  const inline = styled(
    [element('span', ['text'], { style: { color: 'purple !important' } })],
    '#target, span { color: red !important }'
  );
  assert.equal(inline[0].computed.text.color, '#800080');
});

test('synthetic text wrappers are not elements for siblings, nth-child, or empty selectors', () => {
  const tree = styled(
    [
      element('div', [
        node('Text', ['prefix']),
        element('span', []),
        node('Text', ['middle']),
        element('span', ['last']),
      ]),
    ],
    `
    div > span:first-child { color: red; }
    span:empty::before { content: '△'; color: green; }
    span + span:nth-child(2) { color: blue; }
  `
  );
  const first = tree[0].children[1];
  const second = tree[0].children[3];
  assert.equal(first.computed.text.color, '#ff0000');
  assert.equal(first.children[0].children[0], '△');
  assert.equal(first.children[0].computed.text.color, '#008000');
  assert.equal(second.computed.text.color, '#0000ff');
});

test('attribute selectors preserve Yomitan data-sc namespace instead of treating data.class as class', () => {
  const tree = styled(
    [element('span', ['label'], { data: { class: 'tag', content: 'misc-info' } })],
    `
    .tag { display: none; }
    [data-sc-class="tag"][data-sc-content="misc-info"] { background-color: brown; padding: .2em .3em; margin-right: .5em; }
  `
  );
  assert.equal(tree[0].computed.display, 'inline');
  assert.equal(tree[0].computed.box.backgroundColor, '#a52a2a');
  assert.equal(tree[0].computed.box.paddingLeft, 4.8);
  assert.equal(tree[0].computed.box.marginRight, 8);
  assert.equal(flow.buildFlow(tree)[0].atoms[0].kind, 'box');
});

test('font sizes, custom properties, calc and inherited properties resolve without compounding em', () => {
  const tree = styled(
    [
      element('div', [
        node('Text', ['plain']),
        element('span', ['small'], { style: { marginLeft: 0.5 } }),
      ]),
    ],
    `
    div { --base: 20px; font-size: var(--base); color: purple; margin-left: 12px; line-height: 1.2; }
    span { font-size: .8em; padding: calc(2em / var(--divisor, 4)); border: 1px solid currentColor; }
  `
  );
  const parent = tree[0],
    synthetic = parent.children[0],
    child = parent.children[1];
  assert.equal(synthetic.computed.text.fontSize, 20);
  assert.equal(child.computed.text.fontSize, 16);
  assert.equal(child.computed.text.lineHeight, 19.2);
  assert.equal(child.computed.box.paddingTop, 8);
  assert.equal(child.computed.box.marginLeft, 8);
  assert.equal(synthetic.computed.box.marginLeft, undefined);
  assert.equal(child.computed.box.borderTopColor, '#800080');
});

test('functional selector specificity uses maximum :is and zero :where weight', () => {
  const tree = styled(
    [element('span', ['value'], { class: 'word' })],
    `
    :is(#other, span) { color: red; }
    span.word { color: blue; }
    :where(#target, .word) { color: green; }
  `
  );
  assert.equal(tree[0].computed.text.color, '#ff0000');
});

test('overlapping media rules honor viewport, orientation and color scheme', () => {
  const stylesheet = `span { color: black } @media (max-width: 400px) { span { color: red } }
    @media screen and (min-width: 320px) and (prefers-color-scheme: dark) { span { color: blue } }
    @media (orientation: landscape) { span { display: block } }`;
  assert.equal(styled([element('span')], stylesheet)[0].computed.text.color, '#ff0000');
  const dark = styled([element('span')], stylesheet, { ...environment, dark: true })[0];
  assert.equal(dark.computed.text.color, '#0000ff');
  const wide = styled([element('span')], stylesheet, {
    ...environment,
    width: 800,
    height: 360,
  })[0];
  assert.equal(wide.computed.text.color, '#000000');
  assert.equal(wide.computed.display, 'block');
  assert.equal(css.matchesMedia('(width <= 400px)', environment), true);
});

test('HTML whitespace collapses across spans, while pre-wrap and nonbreaking spaces survive', () => {
  const tree = styled(
    [element('div', [node('Text', ['  hello \n ']), element('span', [' \t world\u00a0!  '])])],
    ''
  );
  const atoms = flow.buildFlow(tree[0].children, [tree[0]])[0].atoms;
  assert.equal(atoms.map((a) => a.text).join(''), 'hello world\u00a0!');
  const pre = styled([element('span', [' a\n  b '])], 'span { white-space: pre-wrap }');
  assert.equal(flow.buildFlow(pre)[0].atoms[0].text, ' a\n  b ');
});

test('native output honors stylesheet layout overrides, hidden nodes, styled tags and generated symbols', () => {
  const tree = render(
    [
      element('div', [
        element('span', ['inline']),
        element('div', [' also inline']),
        element('span', ['block']),
        element('span', []),
        element('span', ['hidden']),
      ]),
    ],
    {
      environment,
      stylesheet: css.compileCSS(
        `div div { display: inline } span:nth-child(3) { display: block } span:empty::before { content: '✕' } span:last-child { display: none } span:first-child { background: brown; padding: .2em .3em; }`
      ),
    }
  );
  assert.equal(content(tree), 'inline also inlineblock✕');
  assert.ok(hosts(tree, 'View').some((v) => v.props.style?.backgroundColor === '#a52a2a'));
  for (const textNode of hosts(tree, 'Text'))
    assert.equal(hosts(textNode.children, 'View').length, 0);
});

test('sRGB color mixing preserves alpha and theme variable fallbacks', () => {
  const tree = styled(
    [element('div')],
    'div { background-color: color-mix(in srgb, var(--text-color, var(--fg, #333)) 5%, transparent); }'
  );
  assert.equal(tree[0].computed.box.backgroundColor, 'rgba(51,51,51,0.05)');
  assert.equal(nativeStyle.cssColor('color-mix(in srgb, lime, #333)', '#333'), 'rgba(26,153,26,1)');
});

test('manifest rejects unsupported schemas, traversal, collisions and inconsistent inventory', () => {
  const valid = {
    schemaVersion: 2,
    format: 'react-native-component-tree',
    entries: 1,
    termBanks: [{ path: 'term_bank_1.json', entries: 1 }],
    styles: 'styles.css',
    assets: [{ path: 'assets/image.png', sourcePath: 'image.png' }],
  };
  assert.equal(manifest.parseManifest(valid), valid);
  for (const invalid of [
    { ...valid, schemaVersion: 1 },
    { ...valid, entries: 2 },
    { ...valid, styles: '../styles.css' },
    { ...valid, styles: 'index.json' },
    { ...valid, assets: [{ path: '/image.png', sourcePath: 'image.png' }] },
  ])
    assert.throws(() => manifest.parseManifest(invalid));
});

test('legacy schema-2 nested stylesheets still resolve with correct parent specificity', () => {
  const tree = styled(
    [element('div', [element('span', ['nested'])])],
    `
    div, #other { color: red; & > span { color: blue; &::before { content: '△' } } }
    div span { color: green }
  `
  );
  assert.equal(tree[0].children[0].computed.text.color, '#0000ff');
  assert.equal(tree[0].children[0].children[0].children[0], '△');
});

test('variables resolve before shorthand expansion and invalid colors do not reach native styles', () => {
  const tree = styled(
    [element('span')],
    'span { --pad: 1em 2em; --border: 2px solid purple; padding: var(--pad); border: var(--border); color: invalidcolor; }'
  );
  assert.equal(tree[0].computed.box.paddingLeft, 32);
  assert.equal(tree[0].computed.box.paddingTop, 16);
  assert.equal(tree[0].computed.box.borderLeftWidth, 2);
  assert.equal(tree[0].computed.box.borderLeftColor, '#800080');
  assert.equal(tree[0].computed.text.color, environment.color);
});

test('native text alignment, initial resets, opacity and scaled em boxes use computed styles', () => {
  const tree = render([element('div', [element('span', ['center'])])], {
    environment,
    stylesheet: css.compileCSS(
      'div { text-align: center; font-weight: bold } span { font-weight: initial }'
    ),
  });
  assert.equal(hosts(tree, 'Text')[0].props.style.textAlign, 'center');
  assert.equal(hosts(tree, 'Text').at(-1).props.style.fontWeight, 'normal');
  const scaled = styled([element('span', ['scaled'])], 'span { padding: 1em; opacity: .5 }', {
    ...environment,
    fontScale: 1.5,
  });
  assert.equal(scaled[0].computed.box.paddingLeft, 24);
  assert.equal(scaled[0].computed.box.opacity, 0.5);
  assert.equal(flow.buildFlow(scaled)[0].atoms[0].kind, 'box');
  assert.equal(css.matchesMedia('not (unknown-feature: on)', environment), false);
});

test('list display overrides and CSS custom markers are reflected in native content', () => {
  const list = element('ul', [
    element('li', ['one']),
    element('li', ['two']),
    element('li', ['hidden']),
  ]);
  const tree = render([list], {
    environment,
    stylesheet: css.compileCSS(
      'ul { list-style-type: "＊" } li:nth-child(2) { display: block } li:last-child { display: none }'
    ),
  });
  assert.equal(content(tree), '＊onetwo');
});

test('preformatted lines and block-displayed ruby retain their native semantic layout', () => {
  const pre = render([element('span', ['first\nsecond'])], {
    environment,
    stylesheet: css.compileCSS('span { white-space: pre }'),
  });
  assert.equal(hosts(pre, 'View').filter((v) => v.props.style?.flexWrap === 'nowrap').length, 2);
  assert.equal(content(pre), 'firstsecond');
  const blockRuby = ruby();
  blockRuby.source = { tag: 'ruby' };
  const tree = render([blockRuby], {
    environment,
    stylesheet: css.compileCSS('ruby { display: block }'),
  });
  assert.equal(content(tree), 'かん漢');
  for (const text of hosts(tree, 'Text')) assert.equal(hosts(text.children, 'View').length, 0);
});

test('custom properties inherit computed values and support function fallbacks without changing quoted content', () => {
  const tree = styled(
    [element('div', [element('span', [])])],
    `
    div { --base: red; --alias: var(--base); }
    span { --base: blue; color: var(--alias); background-color: var(--missing, rgb(1, 2, 3)); }
    span::before { content: "var(--literal)"; }
  `
  );
  const span = tree[0].children[0];
  assert.equal(span.computed.text.color, '#ff0000');
  assert.equal(span.computed.box.backgroundColor, 'rgba(1,2,3,1)');
  assert.equal(span.children[0].children[0], 'var(--literal)');
});

test(
  'real dictionary transformer output renders as valid native host trees',
  { skip: !process.env.YOMITAN_SOURCE },
  () => {
    const source = process.env.YOMITAN_SOURCE;
    const root = mkdtempSync(join(tmpdir(), 'dictionary-native-e2e-'));
    try {
      const input = join(root, 'input'),
        output = join(root, 'output');
      mkdirSync(input);
      copyFileSync(join(source, 'index.json'), join(input, 'index.json'));
      if (existsSync(join(source, 'styles.css')))
        copyFileSync(join(source, 'styles.css'), join(input, 'styles.css'));
      const entries = JSON.parse(readFileSync(join(source, 'term_bank_1.json'), 'utf8')).slice(
        0,
        8
      );
      writeFileSync(join(input, 'term_bank_1.json'), JSON.stringify(entries));
      const assets = new Set();
      function collect(value) {
        if (!value || typeof value !== 'object') return;
        if (typeof value.path === 'string') assets.add(value.path);
        Object.values(value).forEach(collect);
      }
      collect(entries);
      for (const path of assets) {
        mkdirSync(dirname(join(input, path)), { recursive: true });
        copyFileSync(join(source, path), join(input, path));
      }
      const result = spawnSync('cargo', ['run', '--quiet', '--', input, '--output', output], {
        cwd: process.env.YOMITAN_TRANSFORMER ?? join(source, '..'),
        encoding: 'utf8',
      });
      assert.equal(result.status, 0, result.stderr);
      const converted = JSON.parse(readFileSync(join(output, 'term_bank_1.json'), 'utf8'));
      const inventory = manifest.parseManifest(
        JSON.parse(readFileSync(join(output, 'manifest.json'), 'utf8'))
      );
      const stylesheet = css.compileCSS(
        inventory.styles ? readFileSync(join(output, inventory.styles), 'utf8') : ''
      );
      const legacyStylesheet = existsSync(join(source, 'styles.css'))
        ? css.compileCSS(readFileSync(join(source, 'styles.css'), 'utf8'))
        : [];
      assert.equal(converted.length, 8);
      for (const entry of converted)
        for (const definition of entry[5]) {
          if (definition.type !== 'content') continue;
          const tree = expand(
            renderer.renderDefinition(definition, {
              environment,
              stylesheet,
              resolveAsset: (path) => `file://${join(output, path)}`,
            })
          );
          const legacyTree = expand(
            renderer.renderDefinition(definition, {
              environment,
              stylesheet: legacyStylesheet,
              resolveAsset: (path) => `file://${join(output, path)}`,
            })
          );
          assert.equal(
            content(legacyTree),
            content(tree),
            'legacy nesting must retain the same text and generated symbols'
          );
          for (const text of hosts(tree, 'Text'))
            assert.equal(hosts(text.children, 'View').length, 0);
          for (const view of hosts(tree, 'View'))
            assert.ok(
              view.children.every((child) => typeof child !== 'string'),
              'raw text inside native View'
            );
          assert.ok(content(tree).length > 0 || hosts(tree, 'Image').length > 0);
        }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
);

test('folder and ZIP imports persist CSS/assets transactionally and clean up failed imports', async (t) => {
  const SQLite = require('better-sqlite3');
  const { drizzle } = require('drizzle-orm/better-sqlite3');
  const root = mkdtempSync(join(tmpdir(), 'dictionary-import-test-'));
  const sqlite = new SQLite(':memory:');
  let failPromotion = false;
  class Directory {
    constructor(...parts) {
      this.uri = join(...parts.map((p) => p.uri ?? p));
    }
    get exists() {
      return existsSync(this.uri);
    }
    get name() {
      return this.uri.split('/').at(-1);
    }
    list() {
      return readdirSync(this.uri, { withFileTypes: true }).map((item) =>
        item.isDirectory() ? new Directory(this, item.name) : new File(this, item.name)
      );
    }
    get parentDirectory() {
      return new Directory(dirname(this.uri));
    }
    create() {
      mkdirSync(this.uri, { recursive: true });
    }
    delete() {
      rmSync(this.uri, { recursive: true });
    }
    move(destination) {
      if (failPromotion) throw new Error('Simulated file promotion failure');
      renameSync(this.uri, destination.uri);
      this.uri = destination.uri;
    }
  }
  class File {
    constructor(...parts) {
      this.uri = join(...parts.map((p) => p.uri ?? p));
    }
    get exists() {
      return existsSync(this.uri);
    }
    get name() {
      return this.uri.split('/').at(-1);
    }
    get parentDirectory() {
      return new Directory(dirname(this.uri));
    }
    async text() {
      return readFileSync(this.uri, 'utf8');
    }
    copy(destination) {
      copyFileSync(this.uri, destination.uri);
    }
    delete() {
      rmSync(this.uri);
    }
    stream() {
      const bytes = readFileSync(this.uri);
      return new ReadableStream({
        start(controller) {
          for (let offset = 0; offset < bytes.length; offset += 11)
            controller.enqueue(bytes.subarray(offset, offset + 11));
          controller.close();
        },
      });
    }
  }
  const nativeFs = { Directory, File, Paths: { document: join(root, 'documents') } };
  const assets = loadTsx('../../../lib/dictionaries/assets.ts', {
    'expo-file-system': nativeFs,
    './manifest': manifest,
  });
  const cache = loadTsx('../../../lib/dictionaries/cache.ts', { './css': css });
  const schema = loadTsx('../../../db/dictionaries/schema.ts');
  sqlite.exec(`CREATE TABLE dictionaries (id INTEGER PRIMARY KEY, title TEXT NOT NULL UNIQUE, revision TEXT NOT NULL,
    format INTEGER, version INTEGER, author TEXT, description TEXT, attribution TEXT, source_language TEXT, target_language TEXT, css TEXT);
    CREATE TABLE terms (id INTEGER PRIMARY KEY, dictionary TEXT, expression TEXT, reading TEXT, definition_tags TEXT, rules TEXT, score INTEGER, definitions_json TEXT, sequence INTEGER, term_tags TEXT);`);
  const orm = drizzle(sqlite);
  const params = (values) => (values.length === 1 && Array.isArray(values[0]) ? values[0] : values);
  const tx = {
    getFirstAsync: async (sql, ...values) => sqlite.prepare(sql).get(...params(values)),
    runAsync: async (sql, ...values) => sqlite.prepare(sql).run(...params(values)),
    prepareAsync: async (sql) => ({
      executeAsync: async (values) => sqlite.prepare(sql).run(...values),
      finalizeAsync: async () => {},
    }),
  };
  const dictionariesDb = {
    insert: (...args) => orm.insert(...args),
    $client: {
      withExclusiveTransactionAsync: async (fn) => {
        sqlite.exec('BEGIN');
        try {
          await fn(tx);
          sqlite.exec('COMMIT');
        } catch (error) {
          sqlite.exec('ROLLBACK');
          throw error;
        }
      },
    },
  };
  const importer = loadTsx('../../../db/lib/dictionary-to-sqlite.ts', {
    'expo-file-system': nativeFs,
    '../dictionaries/client': { dictionariesDb },
    '../dictionaries/schema': schema,
    '@/lib/dictionaries/manifest': manifest,
    '@/lib/dictionaries/assets': assets,
    '@/lib/dictionaries/cache': cache,
    '@/lib/dictionaries/css': css,
  });
  const queries = loadTsx('../../../db/features/dictionaries/dictionaries.queries.ts', {
    '@/db/dictionaries/client': { dictionariesDb },
    '@/db/dictionaries/schema': schema,
    '@/lib/dictionaries/cache': cache,
    '@/lib/dictionaries/assets': assets,
  });
  const source = join(root, 'source');
  mkdirSync(join(source, 'assets'), { recursive: true });
  const inventory = {
    schemaVersion: 2,
    format: 'react-native-component-tree',
    entries: 1,
    termBanks: [{ path: 'term_bank_1.json', entries: 1 }],
    styles: 'styles.css',
    assets: [{ sourcePath: 'image.png', path: 'assets/image.png' }],
  };
  const definition = {
    type: 'content',
    children: [
      element('span', ['日本語']),
      node('DictionaryImage', [], { props: { assetPath: 'assets/image.png' } }),
    ],
  };
  writeFileSync(join(source, 'manifest.json'), JSON.stringify(inventory));
  writeFileSync(
    join(source, 'index.json'),
    JSON.stringify({ title: 'Test', revision: '1', format: 3 })
  );
  writeFileSync(
    join(source, 'term_bank_1.json'),
    JSON.stringify([['語', 'ご', '', '', 0, [definition], 1, '']])
  );
  writeFileSync(join(source, 'styles.css'), 'span { color: red }');
  writeFileSync(join(source, 'assets/image.png'), 'image-bytes');
  try {
    await importer.convert(source);
    assert.equal(sqlite.prepare('SELECT css FROM dictionaries').get().css, 'span { color: red }');
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM terms').get().n, 1);
    assert.equal(
      readFileSync(assets.resolveDictionaryAsset('Test', 'assets/image.png'), 'utf8'),
      'image-bytes'
    );
    assert.equal(cache.getDictionaryStyles('Test').length, 1);
    await assert.rejects(importer.convert(source), /already imported/u);
    assert.equal(assets.dictionaryAssetDirectory('Test').exists, true);

    writeFileSync(
      join(source, 'index.json'),
      JSON.stringify({ title: 'Broken', revision: '1', format: 3 })
    );
    writeFileSync(join(source, 'manifest.json'), JSON.stringify({ ...inventory, entries: 2 }));
    await assert.rejects(importer.convert(source), /Inconsistent/u);
    writeFileSync(
      join(source, 'manifest.json'),
      JSON.stringify({
        ...inventory,
        entries: 2,
        termBanks: [{ path: 'term_bank_1.json', entries: 2 }],
      })
    );
    await assert.rejects(importer.convert(source), /count mismatch/u);
    assert.equal(
      sqlite.prepare("SELECT count(*) AS n FROM terms WHERE dictionary = 'Broken'").get().n,
      0
    );
    assert.equal(assets.dictionaryAssetDirectory('Broken').exists, false);

    writeFileSync(join(source, 'manifest.json'), JSON.stringify(inventory));
    failPromotion = true;
    await assert.rejects(importer.convert(source), /promotion failure/u);
    failPromotion = false;
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM dictionaries').get().n, 1);
    assert.equal(
      readdirSync(join(root, 'documents/dictionaries')).some((p) => p.startsWith('.import-')),
      false
    );
    await queries.deleteDictionaryByIdQuery(sqlite.prepare('SELECT id FROM dictionaries').get().id);
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM terms').get().n, 0);
    assert.equal(assets.dictionaryAssetDirectory('Test').exists, false);
    assert.equal(cache.getDictionaryStyles('Test').length, 0);

    const JSZip = require('jszip');
    const cacheDirectory = join(root, 'cache with spaces');
    const pickerDirectory = join(root, 'picker cache');
    mkdirSync(pickerDirectory);
    class ZipFile {
      constructor(...parts) {
        this.file = new File(
          ...parts.map((part) => {
            const value = part.uri ?? part;
            return value.startsWith('file:') ? fileURLToPath(value) : value;
          })
        );
      }
      get uri() {
        return pathToFileURL(this.file.uri).href;
      }
      get exists() {
        return this.file.exists;
      }
      delete() {
        this.file.delete();
      }
    }
    const zipFs = { Directory, File: ZipFile, Paths: { cache: cacheDirectory } };
    let failExtraction = false;
    const unzipFile = async (src, dest) => {
      assert.ok(!src.startsWith('file:'));
      assert.ok(!src.includes('%20'));
      if (failExtraction) {
        writeFileSync(join(dest, 'partial.txt'), 'partial');
        throw new Error('Native extraction failed');
      }
      const zip = await JSZip.loadAsync(readFileSync(src));
      for (const item of Object.values(zip.files)) {
        const target = join(dest, item.name);
        if (item.dir) mkdirSync(target, { recursive: true });
        else {
          mkdirSync(dirname(target), { recursive: true });
          writeFileSync(target, await item.async('uint8array'));
        }
      }
      return dest;
    };
    const zipImporter = loadTsx('../../../features/dictionaries/lib/import-dictionary-zip.ts', {
      'expo-file-system': zipFs,
      '@/db/lib/dictionary-to-sqlite': importer,
      '@/lib/file-system': { unzipFile },
    });
    const sourceFiles = [
      'index.json',
      'manifest.json',
      'term_bank_1.json',
      'styles.css',
      'assets/image.png',
    ];
    writeFileSync(
      join(source, 'index.json'),
      JSON.stringify({ title: 'Test', revision: '1', format: 3 })
    );
    async function archive(name, prefixes = [''], overrides = {}) {
      const zip = new JSZip();
      for (const prefix of prefixes)
        for (const path of sourceFiles) {
          if (overrides[path] === null) continue;
          zip.file(`${prefix}${path}`, overrides[path] ?? readFileSync(join(source, path)));
        }
      zip.file('__MACOSX/._index.json', 'metadata');
      const path = join(pickerDirectory, name);
      writeFileSync(path, await zip.generateAsync({ type: 'uint8array' }));
      return path;
    }
    function cleaned(path) {
      assert.equal(existsSync(path), false, 'cached picker ZIP must be deleted');
      assert.deepEqual(readdirSync(cacheDirectory), [], 'extracted files must be deleted');
    }

    await t.test('ZIP roots and single enclosing folders match directory imports', async () => {
      for (const prefixes of [[''], ['Dictionary 日本語/']]) {
        const path = await archive('My dictionary 日本語.zip', prefixes);
        await zipImporter.importDictionaryZip(pathToFileURL(path).href);
        assert.equal(
          sqlite.prepare('SELECT css FROM dictionaries').get().css,
          'span { color: red }'
        );
        assert.equal(sqlite.prepare('SELECT expression FROM terms').get().expression, '語');
        assert.deepEqual(
          JSON.parse(sqlite.prepare('SELECT definitions_json FROM terms').get().definitions_json),
          [definition]
        );
        assert.equal(
          readFileSync(assets.resolveDictionaryAsset('Test', 'assets/image.png'), 'utf8'),
          'image-bytes'
        );
        cleaned(path);
        const duplicate = await archive('duplicate.zip', prefixes);
        await assert.rejects(
          zipImporter.importDictionaryZip(pathToFileURL(duplicate).href),
          /already imported/u
        );
        cleaned(duplicate);
        assert.equal(assets.dictionaryAssetDirectory('Test').exists, true);
        await queries.deleteDictionaryByIdQuery(
          sqlite.prepare('SELECT id FROM dictionaries').get().id
        );
      }
    });

    await t.test(
      'ambiguous, untransformed, corrupt and partially extracted ZIPs are cleaned up',
      async () => {
        const ambiguous = await archive('multiple.zip', ['one/', 'two/']);
        await assert.rejects(
          zipImporter.importDictionaryZip(pathToFileURL(ambiguous).href),
          /multiple dictionaries/u
        );
        cleaned(ambiguous);
        const raw = await archive('raw-yomitan.zip', [''], { 'manifest.json': null });
        await assert.rejects(
          zipImporter.importDictionaryZip(pathToFileURL(raw).href),
          /Expected a transformed dictionary/u
        );
        cleaned(raw);
        const corrupt = join(pickerDirectory, 'corrupt.zip');
        writeFileSync(corrupt, 'not a ZIP');
        await assert.rejects(
          zipImporter.importDictionaryZip(pathToFileURL(corrupt).href),
          /Could not extract dictionary ZIP/u
        );
        cleaned(corrupt);
        const partial = await archive('partial.zip');
        failExtraction = true;
        await assert.rejects(
          zipImporter.importDictionaryZip(pathToFileURL(partial).href),
          /Native extraction failed/u
        );
        failExtraction = false;
        cleaned(partial);
        assert.equal(sqlite.prepare('SELECT count(*) AS n FROM dictionaries').get().n, 0);
      }
    );

    await t.test('failed bank imports roll back rows, assets and extracted files', async () => {
      const path = await archive('bad-bank.zip', [''], {
        'manifest.json': JSON.stringify({
          ...inventory,
          entries: 2,
          termBanks: [{ path: 'term_bank_1.json', entries: 2 }],
        }),
      });
      await assert.rejects(
        zipImporter.importDictionaryZip(pathToFileURL(path).href),
        /count mismatch/u
      );
      cleaned(path);
      assert.equal(sqlite.prepare('SELECT count(*) AS n FROM dictionaries').get().n, 0);
      assert.equal(sqlite.prepare('SELECT count(*) AS n FROM terms').get().n, 0);
      assert.equal(assets.dictionaryAssetDirectory('Test').exists, false);
    });

    await t.test(
      'ZIP picker cancellation is normal and rejected files do not leave cached copies',
      async () => {
        let result = { canceled: true };
        const picker = loadTsx('../../../lib/file-system/file-system.ts', {
          'expo-file-system': zipFs,
          'expo-document-picker': { getDocumentAsync: async () => result },
          'expo-image-picker': {},
          'expo-sqlite': { defaultDatabaseDirectory: root },
          'react-native-zip-archive': { unzip: unzipFile },
        });
        assert.equal(await picker.getDictionaryZipFile(), null);
        const path = join(pickerDirectory, 'not-a-zip.txt');
        writeFileSync(path, 'not a ZIP');
        result = {
          canceled: false,
          assets: [{ name: 'not-a-zip.txt', uri: pathToFileURL(path).href }],
        };
        await assert.rejects(picker.getDictionaryZipFile(), /Expected a ZIP file/u);
        assert.equal(existsSync(path), false);
      }
    );
  } finally {
    sqlite.close();
    rmSync(root, { recursive: true, force: true });
  }
});

function expand(value) {
  if (Array.isArray(value)) return value.flatMap((child) => [].concat(expand(child)));
  if (!React.isValidElement(value)) return value;
  if (value.type === React.Fragment) return expand(value.props.children);
  if (typeof value.type === 'function') return expand(value.type(value.props));
  return {
    type: value.type,
    props: value.props,
    children: [].concat(expand(value.props.children) ?? []),
  };
}
function hosts(tree, type) {
  if (Array.isArray(tree)) return tree.flatMap((child) => hosts(child, type));
  if (!tree || typeof tree !== 'object') return [];
  return [...(tree.type === type ? [tree] : []), ...hosts(tree.children, type)];
}
function content(tree) {
  if (Array.isArray(tree)) return tree.map(content).join('');
  if (typeof tree === 'string') return tree;
  return tree && typeof tree === 'object' ? content(tree.children) : '';
}
const render = (children, options) =>
  expand(renderer.renderDefinition({ type: 'content', children }, options));

test('plain inline content has one shared native Text container and no nested Views', () => {
  const tree = render([node('View', [node('Text', ['Hello ']), node('Text', ['world']), '!'])]);
  assert.equal(hosts(tree, 'View').length, 1);
  assert.equal(hosts(tree, 'View')[0].children.length, 1);
  assert.equal(hosts(tree, 'View')[0].children[0].type, 'Text');
  assert.equal(content(tree), 'Hello world!');
  for (const textNode of hosts(tree, 'Text'))
    assert.equal(hosts(textNode.children, 'View').length, 0);
});

test('dictionary ruby renders annotation above base without nesting native Views inside Text', () => {
  const tree = render([node('Text', ['before ', ruby(), ' after'])]);
  assert.equal(content(tree), 'before かん漢 after');
  assert.ok(hosts(tree, 'View').some((host) => host.props.style?.flexWrap === 'wrap'));
  const annotation = hosts(tree, 'Text').find((host) => content(host) === 'かん');
  assert.equal(annotation.props.style.fontSize, 10);
  for (const textNode of hosts(tree, 'Text'))
    assert.equal(hosts(textNode.children, 'View').length, 0);
});

test('legacy Ruby JSX API recognizes fragment-wrapped RubyText children', () => {
  const children = React.createElement(
    React.Fragment,
    null,
    React.createElement('Text', null, '漢'),
    React.createElement(
      React.Fragment,
      null,
      React.createElement(rubyComponents.RubyText, null, 'かん')
    )
  );
  const tree = expand(React.createElement(rubyComponents.Ruby, null, children));
  assert.equal(content(tree), 'かん漢');
});

test('link actions survive ruby layout and assets use the app resolver', () => {
  const lookups = [];
  const tree = render(
    [
      node('Link', ['lookup ', ruby()], { props: { href: '?query=漢' } }),
      node('Link', ['external'], { props: { href: 'https://example.com' } }),
      node('DictionaryImage', [], {
        props: { assetPath: 'assets/image.png', width: 20, height: 30, alt: 'diagram' },
      }),
    ],
    {
      onInternalLink: (href) => lookups.push(href),
      resolveAsset: (path) => `file:///dictionary/${path}`,
    }
  );
  const links = hosts(tree, 'Text').filter((host) => host.props.onPress);
  links.find((host) => content(host) === '漢').props.onPress();
  assert.deepEqual(lookups, ['?query=漢']);
  links.find((host) => content(host) === 'external').props.onPress();
  assert.equal(opened.at(-1), 'https://example.com');
  const image = hosts(tree, 'Image')[0];
  assert.equal(image.props.source.uri, 'file:///dictionary/assets/image.png');
  assert.equal(image.props.accessibilityLabel, 'diagram');
});
