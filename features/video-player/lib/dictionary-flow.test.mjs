import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import ts from 'typescript';

// Run: node --test features/video-player/lib/dictionary-flow.test.mjs
// React Native hosts are stubbed: these tests verify tree structure, not device measurements.
const require = createRequire(import.meta.url);
const opened = [];
const native = {
  Text: 'Text',
  View: 'View',
  Image: 'Image',
  Pressable: 'Pressable',
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
