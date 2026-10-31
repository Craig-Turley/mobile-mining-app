import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { outputText } = ts.transpileModule(
  readFileSync(new URL('./entry-modal.tsx', import.meta.url), 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
    },
  }
);
const mapper = { exports: {} };
const mapperCode = ts.transpileModule(
  readFileSync(new URL('../../../lib/entry/entry.mapper.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
).outputText;
new vm.Script(`(function(require, module, exports) { ${mapperCode}\n})`).runInThisContext()(
  require,
  mapper,
  mapper.exports
);

// A deterministic hook/host adapter exercises the modal's event handlers without native hosts.
function mount(results, initialWord = 'root') {
  const states = [];
  let cursor = 0;
  let response = null;
  let query;
  let tree;
  let footer;
  let header;
  let link;
  let token = { base_form: initialWord, reading: initialWord };
  const queued = [];
  const hooks = {
    ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [
        states[index],
        (value) => {
          states[index] = typeof value === 'function' ? value(states[index]) : value;
        },
      ];
    },
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
  };
  const imports = {
    react: hooks,
    'react-native': {
      Text: 'Text',
      View: 'View',
      useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
    },
    'expo-haptics': { impactAsync: async () => {}, ImpactFeedbackStyle: { Heavy: 'heavy' } },
    '@gorhom/bottom-sheet': {
      BottomSheetModal: 'Sheet',
      BottomSheetFooter: 'Footer',
      BottomSheetHandle: 'Handle',
      TouchableOpacity: 'Touchable',
      BottomSheetScrollView: 'Scroll',
      BottomSheetView: 'View',
    },
    '@/components/ui/button': { Button: 'Button' },
    nativewind: { cssInterop: () => {} },
    '@/theme/theme-provider': {
      useAppTheme: () => ({ colors: { foreground: '#333', surface: '#fff' }, theme: 'light' }),
    },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    '@/db/features/queue/queue.queries': {
      insertIntoQueueQuery: async (input) => {
        queued.push(input);
      },
    },
    './custom-add-modal': { CustomAddModal: 'CustomAdd' },
    '@/db/hooks/use-query': {
      NOPQueryMapper: (value) => value,
      useQuery: (fn) => {
        query = fn;
        return { data: response, isLoading: false };
      },
    },
    '@/db/features/dictionaries/dictionaries.queries': {
      lookupTokenQuery: async (value) => results[value.base_form] ?? [],
      lookupExpressionQuery: async (word) => results[word] ?? [],
    },
    '@/db/hooks/use-app-live-query': {
      useAppLiveQuery: () => ({ data: { modelApplicationId: 7 }, isLoading: false, error: null }),
    },
    '@/db/features/defaults/defaults.queries': { getAppDefaultsQuery: () => {} },
    '../lib/render-entry-modal': {
      renderDefinition: (definition, options) => {
        link = options.onInternalLink;
        return React.createElement('Text', null, definition.children[0].children[0]);
      },
    },
    '@/components/ui/ruby': { Ruby: 'Ruby', RubyText: 'RubyText' },
    '@/lib/dictionaries/cache': { getDictionaryStyles: () => [] },
    '@/lib/dictionaries/assets': { resolveDictionaryAsset: () => undefined },
    '@/lib/entry': mapper.exports,
  };
  const module = { exports: {} };
  new vm.Script(`(function(require, module, exports) { ${outputText}\n})`).runInThisContext()(
    (name) => imports[name] ?? require(name),
    module,
    module.exports
  );
  function nodes(node, type) {
    if (Array.isArray(node)) return node.flatMap((child) => nodes(child, type));
    if (!React.isValidElement(node)) return [];
    return [...(node.type === type ? [node] : []), ...nodes(node.props.children, type)];
  }
  function content(node) {
    if (Array.isArray(node)) return node.map(content).join('');
    if (React.isValidElement(node)) return content(node.props.children);
    return typeof node === 'string' || typeof node === 'number' ? String(node) : '';
  }
  function render() {
    cursor = 0;
    tree = module.exports.EntryBottomSheetModal.render({ token }, null);
    footer = nodes(tree, 'Sheet')[0].props.footerComponent({});
    header = nodes(tree, 'Sheet')[0].props.handleComponent({});
  }
  render();
  return {
    queued,
    render,
    async load() {
      response = await query();
      render();
    },
    button(label) {
      return [...nodes(footer, 'Button'), ...nodes(header, 'Touchable')].find(
        (node) => (node.props.accessibilityLabel ?? node.props.label) === label
      )?.props;
    },
    custom() {
      return nodes(tree, 'CustomAdd')[0].props;
    },
    text: () => content(tree),
    counter: () => content(header),
    navigationTouches: () => nodes(header, 'Touchable'),
    navigate(href) {
      link(href);
      render();
    },
    word(word) {
      token = { base_form: word, reading: word };
      render();
    },
    backToWord() {
      nodes(tree, 'Button')
        .find((node) => node.props.label === 'Back to selected word')
        .props.onPress();
      render();
    },
  };
}

function entry(id) {
  return {
    id,
    dictionary: 'Dictionary',
    expression: `word-${id}`,
    reading: `reading-${id}`,
    definitionTags: null,
    rules: 'v1',
    score: 10,
    sequence: id,
    termTags: 'common',
    definitionsJson: JSON.stringify([
      {
        type: 'content',
        children: [{ component: 'Text', props: {}, children: [`definition-${id}`] }],
      },
    ]),
  };
}

test('arrows navigate one entry at a time, clamp at the ends, and both queue actions use the selected entry', async () => {
  const entries = [entry(1), entry(2), entry(3)];
  const modal = mount({ root: entries });
  await modal.load();
  assert.equal(modal.navigationTouches().length, 2);
  assert.equal(modal.button('Previous entry').disabled, true);
  assert.equal(modal.button('Next entry').disabled, false);
  assert.equal(modal.counter(), '1 / 3');
  assert.ok(modal.text().includes('definition-1'));
  assert.ok(!modal.text().includes('definition-2'));
  modal.button('Previous entry').onPress();
  modal.render();
  assert.equal(modal.counter(), '1 / 3');
  modal.button('Next entry').onPress();
  modal.render();
  assert.equal(modal.counter(), '2 / 3');
  await modal.button('Quick Add').onPress();
  assert.deepEqual(modal.queued[0], {
    modelApplicationId: 7,
    entry: {
      id: 2,
      dictionary: 'Dictionary',
      expression: 'word-2',
      reading: 'reading-2',
      definition_tags: null,
      rules: 'v1',
      score: 10,
      sequence: 2,
      term_tags: 'common',
      definitions_json: entries[1].definitionsJson,
    },
  });
  modal.button('Next entry').onPress();
  modal.render();
  assert.equal(modal.button('Next entry').disabled, true);
  modal.button('Next entry').onPress();
  modal.render();
  assert.equal(modal.counter(), '3 / 3');
  modal.button('Previous entry').onPress();
  modal.render();
  modal.button('Add').onPress();
  modal.render();
  assert.equal(modal.custom().visible, true);
  // The model picker retains the entry selected when Add was pressed.
  modal.button('Next entry').onPress();
  modal.render();
  await modal.custom().onSubmit(9);
  assert.deepEqual(modal.queued[1], {
    modelApplicationId: 9,
    entry: modal.queued[0].entry,
  });
});

test('new lookups reset selection, suppress stale queue actions, and hide arrows for a single result', async () => {
  const modal = mount({
    root: [entry(1), entry(2)],
    other: [entry(3)],
    linked: [entry(4), entry(5)],
    empty: [],
  });
  await modal.load();
  modal.button('Next entry').onPress();
  modal.render();
  modal.navigate('?query=linked');
  assert.equal(modal.button('Quick Add'), undefined);
  await modal.load();
  assert.equal(modal.counter(), '1 / 2');
  assert.ok(modal.text().includes('definition-4'));
  modal.button('Next entry').onPress();
  modal.render();
  modal.backToWord();
  await modal.load();
  assert.equal(modal.counter(), '1 / 2');
  assert.ok(modal.text().includes('definition-1'));
  modal.word('other');
  assert.equal(modal.button('Quick Add'), undefined);
  await modal.load();
  assert.equal(modal.button('Previous entry'), undefined);
  assert.equal(modal.button('Next entry'), undefined);
  await modal.button('Quick Add').onPress();
  assert.equal(modal.queued[0].entry.expression, 'word-3');
  assert.equal(
    JSON.parse(modal.queued[0].entry.definitions_json)[0].children[0].children[0],
    'definition-3'
  );
  modal.word('empty');
  await modal.load();
  assert.equal(modal.button('Add'), undefined);
  assert.equal(modal.button('Quick Add'), undefined);
});
