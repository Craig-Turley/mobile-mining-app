import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const project = fileURLToPath(new URL('../', import.meta.url));

// The native hosts/effects are adapted; the provider, navigation adapter, tabs and layout are real.
function runtime(os = 'ios') {
  let rendering;
  let context;
  let scheme = 'light';
  const writes = [];
  const backgrounds = [];
  const dynamicColors = [];
  const modules = new Map();
  const hooks = {
    ...React,
    useState(initial) {
      const index = rendering.cursor++;
      const slots = rendering.slots;
      if (!(index in slots))
        slots[index] = { value: typeof initial === 'function' ? initial() : initial };
      return [
        slots[index].value,
        (update) => {
          slots[index].value = typeof update === 'function' ? update(slots[index].value) : update;
        },
      ];
    },
    useMemo(factory, deps) {
      const index = rendering.cursor++;
      const previous = rendering.slots[index];
      if (previous && deps.every((value, i) => Object.is(value, previous.deps[i])))
        return previous.value;
      const value = factory();
      rendering.slots[index] = { value, deps };
      return value;
    },
    useLayoutEffect(effect, deps) {
      const index = rendering.cursor++;
      const previous = rendering.slots[index];
      if (previous && deps.every((value, i) => Object.is(value, previous.deps[i]))) return;
      const slot = { deps, cleanup: previous?.cleanup };
      rendering.slots[index] = slot;
      rendering.effects.push(() => {
        slot.cleanup?.();
        slot.cleanup = effect();
      });
    },
    useContext: () => context,
  };
  const baseThemes = {
    DarkTheme: {
      dark: true,
      colors: { background: 'black', primary: 'blue' },
      fonts: { regular: { fontFamily: 'System', fontWeight: '400' } },
    },
    DefaultTheme: {
      dark: false,
      colors: { background: 'white', primary: 'blue' },
      fonts: { regular: { fontFamily: 'System', fontWeight: '400' } },
    },
  };
  const NativeTabs = Object.assign(() => null, {
    Trigger: Object.assign(() => null, { Label: 'Label', Icon: 'Icon' }),
  });
  const Stack = Object.assign(() => null, { Screen: 'StackScreen' });
  const overrides = {
    react: hooks,
    'react-native': {
      View: 'View',
      Platform: { OS: os },
      Appearance: {
        getColorScheme: () => scheme,
        setColorScheme: (value) => {
          writes.push(value);
          scheme = value;
        },
      },
      DynamicColorIOS: (value) => {
        assert.equal(os, 'ios');
        dynamicColors.push(value);
        return { dynamic: value };
      },
    },
    '@react-navigation/native': { ...baseThemes, ThemeProvider: 'NavigationThemeProvider' },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    'expo-system-ui': {
      setBackgroundColorAsync: async (value) => {
        backgrounds.push(value);
      },
    },
    nativewind: { vars: (value) => value },
    'expo-router/unstable-native-tabs': { NativeTabs },
    'expo-router': { Stack },
    'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider' },
    'react-native-gesture-handler': { GestureHandlerRootView: 'GestureHandlerRootView' },
    '@/contexts/database-provider': { DatabaseProvider: 'DatabaseProvider' },
    '@/global.css': {},
  };
  function load(filename) {
    const absolute = filename.startsWith(project) ? filename : join(project, filename);
    const path = /\.(tsx?|js)$/u.test(absolute) ? absolute : `${absolute}.ts`;
    if (modules.has(path)) return modules.get(path).exports;
    const module = { exports: {} };
    modules.set(path, module);
    const output = ts.transpileModule(readFileSync(path, 'utf8'), {
      fileName: path,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText;
    new vm.Script(`(function(require, module, exports) { ${output}\n})`).runInThisContext()(
      (name) => {
        if (overrides[name]) return overrides[name];
        if (name.startsWith('@/')) return load(name.slice(2));
        if (name.startsWith('.')) return load(join(dirname(path), name));
        return require(name);
      },
      module,
      module.exports
    );
    return module.exports;
  }
  // Alias resolution is explicit for the provider's TSX entry point.
  overrides['@/theme/theme-provider'] = load('theme/theme-provider.tsx');
  function renderComponent(component) {
    const state = { slots: [], cursor: 0, effects: [] };
    return {
      render(props = {}) {
        rendering = state;
        state.cursor = 0;
        state.effects = [];
        const tree = component(props);
        rendering = undefined;
        for (const effect of state.effects) effect();
        return tree;
      },
      unmount() {
        for (const slot of state.slots) slot?.cleanup?.();
      },
    };
  }
  const provider = renderComponent(overrides['@/theme/theme-provider'].AppThemeProvider);
  let tree;
  function renderProvider(children = 'route') {
    tree = provider.render({ children });
    context = tree.props.value;
    return tree;
  }
  function nodes(node, type) {
    if (Array.isArray(node)) return node.flatMap((child) => nodes(child, type));
    if (!React.isValidElement(node)) return [];
    return [...(node.type === type ? [node] : []), ...nodes(node.props.children, type)];
  }
  renderProvider();
  return {
    load,
    provider,
    renderProvider,
    renderComponent,
    nodes,
    writes,
    backgrounds,
    dynamicColors,
    baseThemes,
    NativeTabs,
    Stack,
    context: () => context,
    scheme: () => scheme,
  };
}

test('navigation, tokens, root appearance and status bar change together for both palettes', () => {
  const rt = runtime();
  const { lightColors, darkColors } = rt.load('theme/colors.ts');
  assert.deepEqual(Object.keys(lightColors).sort(), Object.keys(darkColors).sort());
  let tree = rt.renderProvider('Watch');
  assert.equal(rt.context().theme, 'dark');
  assert.equal(rt.scheme(), 'dark');
  assert.deepEqual(rt.writes, ['dark']);
  const navigation = rt.nodes(tree, 'NavigationThemeProvider')[0].props.value;
  assert.equal(navigation.dark, true);
  assert.equal(navigation.colors.background, darkColors.background);
  assert.equal(navigation.fonts, rt.baseThemes.DarkTheme.fonts);
  assert.equal(rt.nodes(tree, 'StatusBar')[0].props.style, 'light');
  assert.equal(rt.nodes(tree, 'View')[0].props.style[1].backgroundColor, darkColors.background);
  rt.renderProvider('Queue');
  rt.renderProvider('Anki');
  assert.deepEqual(
    rt.writes,
    ['dark'],
    'navigation/rendering must not reset the native appearance'
  );
  assert.deepEqual(rt.backgrounds, [darkColors.background]);

  rt.context().setTheme('light');
  tree = rt.renderProvider();
  assert.equal(rt.context().colors, lightColors);
  assert.equal(rt.scheme(), 'light');
  assert.equal(rt.nodes(tree, 'NavigationThemeProvider')[0].props.value.dark, false);
  assert.equal(
    rt.nodes(tree, 'NavigationThemeProvider')[0].props.value.fonts,
    rt.baseThemes.DefaultTheme.fonts
  );
  assert.equal(rt.nodes(tree, 'StatusBar')[0].props.style, 'dark');
  const style = rt.nodes(tree, 'View')[0].props.style;
  assert.equal(style[0]['--color-background'], lightColors.background);
  assert.equal(style[0]['--color-primary-muted'], lightColors.primaryMuted);
  assert.equal(style[1].backgroundColor, lightColors.background);
  assert.equal(rt.backgrounds.at(-1), lightColors.background);
  rt.context().toggleTheme();
  rt.renderProvider();
  assert.equal(rt.context().theme, 'dark');
  rt.provider.unmount();
  assert.deepEqual(
    rt.writes,
    ['dark', 'light', 'dark'],
    'unmounting must not flash the system/light theme'
  );
});

test('native tabs and stack backing surfaces follow the theme without remounting or freezing glass appearance', () => {
  const rt = runtime();
  const tabs = rt.renderComponent(rt.load('components/app-tabs.tsx').default);
  const first = tabs.render();
  const darkBackground = rt.context().colors.background;
  for (const trigger of React.Children.toArray(first.props.children)) {
    assert.equal(trigger.props.contentStyle.backgroundColor, darkBackground);
    assert.equal(trigger.props.unstable_nativeProps, undefined);
  }
  assert.equal(first.props.backgroundColor, undefined, 'preserve the native glass material');
  assert.equal(first.props.iconColor.default.dynamic.dark, rt.context().colors.mutedForeground);
  const again = tabs.render();
  assert.equal(again.props.iconColor, first.props.iconColor);
  assert.equal(rt.dynamicColors.length, 2);
  const Root = rt.load('app/_layout.tsx').default;
  const rootTree = Root();
  const content = rt.renderComponent(rootTree.props.children.type);
  let stack = content.render();
  assert.equal(
    rt.nodes(stack, 'GestureHandlerRootView')[0].props.style.backgroundColor,
    darkBackground
  );
  assert.equal(
    rt.nodes(stack, rt.Stack)[0].props.screenOptions.contentStyle.backgroundColor,
    darkBackground
  );

  rt.context().setTheme('light');
  rt.renderProvider();
  const light = tabs.render();
  stack = content.render();
  assert.deepEqual(
    React.Children.toArray(light.props.children).map((node) => node.props.name),
    React.Children.toArray(first.props.children).map((node) => node.props.name)
  );
  for (const trigger of React.Children.toArray(light.props.children))
    assert.equal(trigger.props.contentStyle.backgroundColor, rt.context().colors.background);
  assert.equal(
    rt.nodes(stack, rt.Stack)[0].props.screenOptions.headerTintColor,
    rt.context().colors.foreground
  );
  assert.equal(
    rt.nodes(stack, rt.Stack)[0].props.screenOptions.contentStyle.backgroundColor,
    rt.context().colors.background
  );
});

test('Android tab colors derive from the selected palette without iOS-only dynamic colors', () => {
  const rt = runtime('android');
  const tabs = rt.renderComponent(rt.load('components/app-tabs.tsx').default);
  assert.equal(tabs.render().props.tintColor, rt.context().colors.primary);
  rt.context().setTheme('light');
  rt.renderProvider();
  assert.equal(tabs.render().props.tintColor, rt.context().colors.primary);
  assert.equal(rt.dynamicColors.length, 0);
});

test('native build defaults and startup backgrounds agree with the default runtime palette', () => {
  const rt = runtime();
  const { DEFAULT_THEME, getAppTheme } = rt.load('theme/app-theme.ts');
  const config = JSON.parse(readFileSync(join(project, 'app.json'), 'utf8')).expo;
  const normalizeColor = require('@react-native/normalize-colors');
  assert.equal(DEFAULT_THEME, 'dark');
  assert.equal(config.userInterfaceStyle, DEFAULT_THEME);
  assert.ok(config.plugins.includes('expo-system-ui'));
  assert.equal(
    normalizeColor(config.backgroundColor),
    normalizeColor(getAppTheme(DEFAULT_THEME).colors.background)
  );
  assert.equal(
    normalizeColor(config.splash.backgroundColor),
    normalizeColor(config.backgroundColor)
  );
});
