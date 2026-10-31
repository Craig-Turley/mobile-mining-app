import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { setImmediate as tick } from 'node:timers/promises';
import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import ts from 'typescript';

const require = createRequire(import.meta.url);

function load(relative, imports) {
  const output = ts.transpileModule(readFileSync(new URL(relative, import.meta.url), 'utf8'), {
    fileName: relative,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  new vm.Script(`(function(require, module, exports) { ${output}\n})`).runInThisContext()(
    (name) => imports[name] ?? require(name),
    module,
    module.exports
  );
  return module.exports;
}

// Exercise the real query hook across modal openings, with deterministic hooks/native hosts.
async function mount(kind, initialId = null) {
  const slots = [];
  let cursor = 0;
  let dirty = true;
  let effects = [];
  let visible = false;
  let records = [];
  let queryError = null;
  let calls = 0;
  let tree;
  const events = [];
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots))
        slots[index] = { value: typeof initial === 'function' ? initial() : initial };
      return [
        slots[index].value,
        (update) => {
          const value = typeof update === 'function' ? update(slots[index].value) : update;
          if (!Object.is(value, slots[index].value)) {
            slots[index].value = value;
            dirty = true;
          }
        },
      ];
    },
    useRef(value) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: value };
      return slots[index];
    },
    useEffect(effect, deps) {
      const index = cursor++;
      const previous = slots[index];
      if (
        previous &&
        deps.length === previous.deps.length &&
        deps.every((value, i) => Object.is(value, previous.deps[i]))
      )
        return;
      slots[index] = { deps, cleanup: previous?.cleanup };
      effects.push(() => {
        slots[index].cleanup?.();
        slots[index].cleanup = effect();
      });
    },
  };
  const query = load('../../../db/hooks/use-query.ts', { react: hooks });
  const fetchRecords = async () => {
    calls++;
    if (queryError) throw queryError;
    return records;
  };
  const imports = {
    react: hooks,
    'react-native': Object.fromEntries(
      ['ActivityIndicator', 'Modal', 'Pressable', 'ScrollView', 'Text', 'View'].map((name) => [
        name,
        name,
      ])
    ),
    '@/components/ui/button': { Button: 'Button' },
    '@/db/features/decks/decks.queries': { allDecksQuery: fetchRecords },
    '@/db/features/models/models.queries': { allModelsQuery: fetchRecords },
    '@/db/hooks/use-query': query,
    '@/theme/theme-provider': {
      useAppTheme: () => ({ colors: { foreground: '#333', primary: '#f00' } }),
    },
    '@expo/vector-icons': { Ionicons: 'Icon' },
  };
  const Component =
    kind === 'deck'
      ? load('./custom-export-modal.tsx', imports).CustomExportModal
      : load('../../video-player/components/custom-add-modal.tsx', imports).CustomAddModal;
  async function flush() {
    for (let i = 0; i < 30; i++) {
      if (dirty) {
        dirty = false;
        cursor = 0;
        effects = [];
        tree = Component({
          visible,
          initialDeckApplicationId: initialId,
          initialModelApplicationId: initialId,
          onClose: () => {
            events.push('close');
            visible = false;
            dirty = true;
          },
          onSubmit: async (id) => {
            events.push(id);
          },
        });
        for (const effect of effects) effect();
      }
      await tick();
      if (!dirty) return;
    }
    throw new Error('Modal did not settle');
  }
  function nodes(node, type) {
    if (Array.isArray(node)) return node.flatMap((child) => nodes(child, type));
    if (!React.isValidElement(node)) return [];
    return [...(node.type === type ? [node] : []), ...nodes(node.props.children, type)];
  }
  function text(node) {
    if (Array.isArray(node)) return node.map(text).join('');
    if (React.isValidElement(node)) return text(node.props.children);
    return typeof node === 'string' ? node : '';
  }
  await flush();
  return {
    events,
    flush,
    text: () => text(tree),
    calls: () => calls,
    records(value) {
      records = value;
    },
    error(value) {
      queryError = value;
    },
    async open() {
      visible = true;
      dirty = true;
      await flush();
    },
    async close() {
      visible = false;
      dirty = true;
      await flush();
    },
    button(label) {
      return nodes(tree, 'Button').find((node) => node.props.label === label).props;
    },
    option(name) {
      return nodes(tree, 'Pressable').find(
        (node) => node.props.accessibilityState && text(node).includes(name)
      ).props;
    },
  };
}

const deck = (id, name) => ({ applicationId: id, deckFormData: { name } });
const model = (id, name) => ({ applicationId: id, modelFormData: { name } });

test('export refreshes decks on opening and submits the selected destination deck', async () => {
  const modal = await mount('deck');
  assert.equal(modal.calls(), 0);
  await modal.open();
  assert.ok(modal.text().includes('No decks are available'));
  assert.ok(!modal.text().includes('No models'));
  assert.equal(modal.button('Export').disabled, true);
  await modal.close();
  modal.records([deck(10, 'Test deck'), deck(20, 'Another deck')]);
  await modal.open();
  assert.equal(modal.calls(), 2);
  assert.ok(modal.text().includes('Test deck'));
  assert.equal(modal.option('Test deck').accessibilityState.selected, true);
  modal.option('Another deck').onPress();
  await modal.flush();
  assert.equal(modal.option('Another deck').accessibilityState.selected, true);
  assert.equal(modal.button('Export').disabled, false);
  await modal.button('Export').onPress();
  await modal.flush();
  assert.deepEqual(modal.events, ['close', 20]);
});

test('export defaults are validated against fresh results and query failures are not shown as empty decks', async () => {
  const modal = await mount('deck', 20);
  modal.records([deck(10, 'First'), deck(20, 'Default')]);
  await modal.open();
  assert.equal(modal.option('Default').accessibilityState.selected, true);
  await modal.close();
  modal.records([deck(30, 'Replacement')]);
  await modal.open();
  assert.equal(modal.option('Replacement').accessibilityState.selected, true);
  await modal.close();
  modal.error(new Error('Database unavailable'));
  await modal.open();
  assert.ok(modal.text().includes('Could not load decks'));
  assert.ok(modal.text().includes('Database unavailable'));
  assert.ok(!modal.text().includes('No decks are available'));
  assert.equal(modal.button('Export').disabled, true);
  await modal.button('Export').onPress();
  assert.deepEqual(modal.events, []);
});

test('Add refreshes registered models when opened instead of retaining the initial empty list', async () => {
  const modal = await mount('model', 99);
  await modal.open();
  assert.ok(modal.text().includes('No models are available'));
  await modal.close();
  modal.records([model(7, 'Registered model'), model(8, 'Other model')]);
  await modal.open();
  assert.equal(modal.calls(), 2);
  assert.equal(modal.option('Registered model').accessibilityState.selected, true);
  modal.option('Other model').onPress();
  await modal.flush();
  await modal.button('Add').onPress();
  await modal.flush();
  assert.deepEqual(modal.events, [8, 'close']);
});
