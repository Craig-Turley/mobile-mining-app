import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Run: node --test lib/youtube-webview/browser.test.mjs
// Stub native hosts and hooks to exercise the screen's message handling and popup.
const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../../app/youtube-web-view.tsx', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022,
  },
});

function createBrowser() {
  const hooks = [];
  const logs = [];
  let cursor = 0;
  const imports = {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in hooks)) hooks[index] = initial;
        return [hooks[index], (value) => (hooks[index] = value)];
      },
      useRef(initial) {
        const index = cursor++;
        if (!(index in hooks)) hooks[index] = { current: initial };
        return hooks[index];
      },
    },
    'react-native': { View: 'View', Text: 'Text' },
    'react-native-safe-area-context': {
      SafeAreaView: 'SafeAreaView',
      useSafeAreaInsets: () => ({ bottom: 0 }),
    },
    'react-native-webview': { WebView: 'WebView' },
    'expo-router': { Stack: { Screen: 'Screen' }, router: {} },
    '@/components/ui/button': { Button: 'Button' },
    '@/lib/youtube-webview': { normalizeYoutubeCaptions: (events) => events },
  };
  const module = { exports: {} };
  const run = new vm.Script(
    `(function(require, module, exports, console) { ${outputText}\n})`
  ).runInThisContext();
  run((name) => imports[name] ?? require(name), module, module.exports, {
    info: (...args) => logs.push(args),
    warn: (...args) => logs.push(args),
  });
  function render() {
    cursor = 0;
    return module.exports.default();
  }
  function find(node, type, predicate = () => true) {
    if (!node || typeof node !== 'object') return undefined;
    if (node.type === type && predicate(node)) return node;
    for (const child of [node.props?.children].flat()) {
      const match = find(child, type, predicate);
      if (match) return match;
    }
  }
  return {
    send(payload) {
      find(render(), 'WebView').props.onMessage({
        nativeEvent: { data: JSON.stringify(payload) },
      });
    },
    popup: () => find(render(), 'Text')?.props.children,
    disabled: () => find(render(), 'Button')?.props.disabled,
    status: () =>
      find(render(), 'Text', (node) => node.props.className === 'text-sm text-foreground')?.props
        .children,
    logs,
    script: () => find(render(), 'WebView').props.injectedJavaScriptBeforeContentLoaded,
  };
}

const watch = (videoId) => ({ tag: 'watch', videoId, url: 'https://www.youtube.com' });
const captions = (videoId) => ({
  tag: 'timedtext',
  videoId,
  status: 200,
  responseUrl: 'https://www.youtube.com/api/timedtext?v=video-a&signature=secret',
  body: JSON.stringify({ events: [{ tStartMs: 0, segs: [{ utf8: 'Hello' }] }] }),
});

test('popup stays hidden until a nonempty video ID is detected', () => {
  const browser = createBrowser();
  assert.equal(browser.popup(), undefined);
  for (const id of [null, '', '   ']) {
    browser.send(watch(id));
    assert.equal(browser.popup(), undefined);
  }
  browser.send(watch('video-a'));
  assert.equal(browser.popup(), 'Enable Captions to Watch');
  assert.equal(browser.disabled(), true);
  browser.send(captions('video-a'));
  assert.equal(browser.popup(), 'Watch Now');
  assert.equal(browser.disabled(), false);
  browser.send(watch('video-a'));
  assert.equal(browser.popup(), 'Watch Now');
});

test('navigation clears captions and ignores responses for other videos', () => {
  const browser = createBrowser();
  browser.send(watch('video-a'));
  browser.send(captions('video-a'));
  browser.send(watch('video-b'));
  browser.send(captions('video-a'));
  assert.equal(browser.popup(), 'Enable Captions to Watch');
  assert.equal(browser.disabled(), true);
  browser.send(captions('video-b'));
  assert.equal(browser.popup(), 'Watch Now');
  browser.send(watch(null));
  browser.send(captions('video-b'));
  assert.equal(browser.popup(), undefined);
  browser.send(watch('video-b'));
  assert.equal(browser.popup(), 'Enable Captions to Watch');
  browser.send(captions(null));
  assert.equal(browser.disabled(), true);
  browser.send(captions('video-b'));
  browser.send({ tag: 'reset' });
  browser.send(captions('video-b'));
  assert.equal(browser.popup(), undefined);
});

test('caption parse failures are visible and can recover on the next response', () => {
  const browser = createBrowser();
  browser.send(watch('video-a'));
  assert.match(browser.status(), /Waiting for caption data/);
  assert.doesNotMatch(browser.status(), /VPN/);
  browser.send({ ...captions('video-a'), body: '<transcript></transcript>' });
  assert.match(browser.status(), /captions could not be read/);
  assert.match(browser.status(), /Expected caption JSON but received markup from YouTube/);
  assert.ok(
    browser.status().endsWith('(enabled VPN might cause your request to be blocked by YouTube)')
  );
  assert.equal(browser.disabled(), true);
  assert.equal(browser.logs.at(-1)[0], 'YouTube caption capture failed:');
  const responseLog = browser.logs.find(([label]) => label === 'YouTube caption response:')[1];
  assert.equal(responseLog.status, 200);
  assert.equal(responseLog.responsePath, 'https://www.youtube.com/api/timedtext');
  assert.equal(JSON.stringify(browser.logs).includes('signature=secret'), false);
  const markupLog = browser.logs.find(
    ([label]) => label === 'YouTube returned markup instead of caption JSON:'
  )[1];
  assert.equal(markupLog.bodyStart, '<transcript></transcript>');
  browser.send(captions('video-a'));
  assert.equal(browser.status(), undefined);
  assert.equal(browser.disabled(), false);
  browser.send(watch('video-b'));
  assert.match(browser.status(), /Waiting for caption data/);
});

test('rate-limited captions show a blocking message without attempting to parse HTML', () => {
  const browser = createBrowser();
  browser.send(watch('video-a'));
  browser.send({ ...captions('video-a'), status: 429, body: '<html>Sorry...</html>' });
  assert.match(browser.status(), /temporarily blocking caption requests \(429\)/);
  assert.ok(
    browser.status().endsWith('(enabled VPN might cause your request to be blocked by YouTube)')
  );
  assert.equal(browser.disabled(), true);
  assert.equal(
    browser.logs.some(([label]) => label === 'YouTube caption capture failed:'),
    false
  );
  assert.equal(
    browser.logs.some(([label]) => label === 'YouTube returned markup instead of caption JSON:'),
    false
  );
  browser.send(captions('video-a'));
  assert.equal(browser.status(), undefined);
  assert.equal(browser.disabled(), false);
});

test('HTTP failures are reported separately from caption parse failures', () => {
  const browser = createBrowser();
  browser.send(watch('video-a'));
  browser.send({ ...captions('video-a'), status: 403, body: '<html>Forbidden</html>' });
  assert.match(browser.status(), /HTTP 403/);
  assert.ok(
    browser.status().endsWith('(enabled VPN might cause your request to be blocked by YouTube)')
  );
  assert.equal(browser.disabled(), true);
});

test('capture errors display the current error message and VPN hint', () => {
  const browser = createBrowser();
  browser.send(watch('video-a'));
  browser.send({ tag: 'error', transport: 'fetch', message: 'Network request failed' });
  assert.match(browser.status(), /Network request failed/);
  assert.ok(
    browser.status().endsWith('(enabled VPN might cause your request to be blocked by YouTube)')
  );
  browser.send(watch('video-b'));
  assert.doesNotMatch(browser.status(), /Network request failed|VPN/);
});

test('XHR capture reports HTTP status and the final response URL', () => {
  const browser = createBrowser();
  const messages = [];
  class FakeXHR {
    responseType = 'text';
    responseText = '<html><body>Forbidden</body></html>';
    status = 403;
    responseURL = 'https://www.youtube.com/api/timedtext?v=video-a';
    open() {}
    addEventListener(_name, listener) {
      this.onLoad = listener;
    }
    getResponseHeader() {
      return 'text/html; charset=UTF-8';
    }
  }
  vm.runInNewContext(browser.script(), {
    window: {
      location: {
        href: 'https://www.youtube.com/watch?v=video-a',
        origin: 'https://www.youtube.com',
      },
      ReactNativeWebView: { postMessage: (message) => messages.push(JSON.parse(message)) },
      addEventListener() {},
    },
    history: { pushState() {}, replaceState() {} },
    URL,
    XMLHttpRequest: FakeXHR,
  });
  const request = new FakeXHR();
  request.open('GET', 'https://www.youtube.com/api/timedtext?v=video-a');
  request.onLoad();
  const message = messages.at(-1);
  assert.equal(message.tag, 'timedtext');
  assert.equal(message.status, 403);
  assert.equal(message.responseUrl, request.responseURL);
  assert.equal(message.body, request.responseText);
});

test('injected detection follows watch-page navigation, including back and forward', () => {
  const browser = createBrowser();
  const messages = [];
  const listeners = {};
  const window = {
    location: { href: 'https://www.youtube.com/', origin: 'https://www.youtube.com' },
    ReactNativeWebView: { postMessage: (message) => messages.push(JSON.parse(message)) },
    addEventListener: (name, listener) => (listeners[name] = listener),
  };
  const history = {
    pushState: (_state, _title, url) => (window.location.href = url),
    replaceState: (_state, _title, url) => (window.location.href = url),
  };
  vm.runInNewContext(browser.script(), {
    window,
    history,
    URL,
    XMLHttpRequest: { prototype: { open() {} } },
  });
  assert.equal(messages.at(-1).videoId, null);
  history.pushState(null, '', 'https://www.youtube.com/watch?v=video-a');
  assert.equal(messages.at(-1).videoId, 'video-a');
  history.replaceState(null, '', 'https://www.youtube.com/results?search_query=test');
  assert.equal(messages.at(-1).videoId, null);
  window.location.href = 'https://www.youtube.com/watch?v=video-b';
  listeners.popstate();
  assert.equal(messages.at(-1).videoId, 'video-b');
  window.location.href = 'https://www.youtube.com/@channel';
  listeners['yt-navigate-finish']();
  assert.equal(messages.at(-1).videoId, null);
});
