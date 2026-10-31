import { clone, generate, List, parse, walk, type CssNode } from 'css-tree';
import type { ResolveGlossaryAsset } from './html-utils';

/** Rewrite local URLs before embedding CSS, including URLs inside custom properties. */
export async function rewriteCssAssets(
  ast: CssNode,
  scope: string,
  resolveAsset: ResolveGlossaryAsset
) {
  walk(ast, (node) => {
    if (node.type === 'Declaration' && node.value.type === 'Raw') {
      const value = parse(node.value.value, { context: 'value' });
      if (value.type === 'Value') node.value = value;
    }
  });
  const urls: { value: string }[] = [];
  walk(ast, (node) => {
    if (node.type === 'Url') urls.push(node);
  });
  for (const url of urls) {
    if (url.value.startsWith('data:')) continue;
    url.value = url.value.startsWith('#')
      ? `#${scope}-${url.value.slice(1)}`
      : await resolveAsset(url.value);
  }
}

function nestedSelector(selector: CssNode, parents?: string): CssNode {
  if (!parents) return clone(selector);
  const result = clone(selector);
  const replacement = parse(`:is(${parents})`, { context: 'selector' });
  let nested = false;
  walk(result, (node) => {
    if (
      node.type === 'NestingSelector' &&
      replacement.type === 'Selector' &&
      replacement.children.first
    ) {
      Object.assign(node, clone(replacement.children.first));
      nested = true;
    }
  });
  return nested ? result : parse(`:is(${parents}) ${generate(result)}`, { context: 'selector' });
}

function scopedSelector(selector: CssNode, scope: string): string {
  if (selector.type !== 'Selector') throw new Error('Invalid dictionary CSS selector');
  const parts = selector.children.toArray();
  let rootEnd = 0;
  let start = 0;
  // Keep document/theme conditions outside the scope, but apply their declarations locally.
  while (start < parts.length) {
    let end = start;
    while (end < parts.length && parts[end].type !== 'Combinator') end++;
    const root = parts.slice(start, end).some(isDocumentRoot);
    if (!root) break;
    rootEnd = end;
    const pseudo = parts
      .slice(start, end)
      .findIndex(
        (node) =>
          node.type === 'PseudoElementSelector' ||
          (node.type === 'PseudoClassSelector' &&
            ['before', 'after', 'first-line', 'first-letter'].includes(node.name))
      );
    if (pseudo >= 0) {
      rootEnd = start + pseudo;
      break;
    }
    start = end + 1;
  }
  walk(selector, (node) => {
    if (node.type === 'IdSelector') node.name = `${scope}-${node.name}`;
    if (
      node.type === 'AttributeSelector' &&
      node.name.type === 'Identifier' &&
      node.name.name === 'id' &&
      ['=', '^=', '|='].includes(node.matcher ?? '') &&
      node.value &&
      (node.value.type === 'String' || node.value.type === 'Identifier')
    ) {
      if (node.value.type === 'String') node.value.value = `${scope}-${node.value.value}`;
      else node.value.name = `${scope}-${node.value.name}`;
    }
  });
  const prefix = `:where(.${scope})`;
  const rootCombinator = parts[rootEnd];
  if (
    rootEnd > 0 &&
    rootCombinator?.type === 'Combinator' &&
    ['+', '~'].includes(rootCombinator.name)
  ) {
    // A document-root sibling cannot belong to this glossary; don't let it target card siblings.
    return `${prefix} ${generate(selector)}`;
  }
  return rootEnd > 0
    ? `${parts
        .slice(0, rootEnd)
        .map((node) => generate(node))
        .join('')} ${prefix}${parts
        .slice(rootEnd)
        .map((node) => generate(node))
        .join('')}`
    : `${prefix} ${generate(selector)}`;
}

export async function scopeDictionaryCss(
  css: string,
  scope: string,
  resolveAsset: ResolveGlossaryAsset
): Promise<string> {
  const ast = parse(css);
  await rewriteCssAssets(ast, scope, resolveAsset);
  const names = new Map<string, string>();
  // Keyframe, counter and font names are document-global even when selectors are scoped.
  walk(ast, (node) => {
    if (node.type !== 'Atrule' || !node.prelude) return;
    if (['keyframes', '-webkit-keyframes', 'counter-style'].includes(node.name)) {
      const name = generate(node.prelude);
      names.set(name, `${scope}-${name}`);
    }
  });
  walk(ast, (node) => {
    if (node.type === 'Atrule' && node.name === 'font-face' && node.block) {
      node.block.children.forEach((child) => {
        if (child.type === 'Declaration' && child.property === 'font-family') {
          const value = child.value;
          walk(value, (part) => {
            if (part.type === 'String') names.set(part.value, `${scope}-${part.value}`);
            else if (part.type === 'Identifier') names.set(part.name, `${scope}-${part.name}`);
          });
        }
      });
    }
  });
  walk(ast, (node) => {
    if (
      node.type === 'Declaration' &&
      /^(animation(-name)?|list-style(-type)?|font(-family)?)$/u.test(node.property)
    ) {
      walk(node.value, (part) => {
        if (part.type === 'Identifier' && names.has(part.name)) part.name = names.get(part.name)!;
        else if (part.type === 'String' && names.has(part.value))
          part.value = names.get(part.value)!;
      });
    }
    if (
      node.type === 'Atrule' &&
      ['keyframes', '-webkit-keyframes', 'counter-style'].includes(node.name) &&
      node.prelude
    ) {
      const prelude = parse(names.get(generate(node.prelude)) ?? generate(node.prelude), {
        context: 'atrulePrelude',
        atrule: node.name,
      });
      if (prelude.type === 'AtrulePrelude') node.prelude = prelude;
    }
  });
  function rules(nodes: List<CssNode>, parents?: string): string {
    let output = '';
    nodes.forEach((node) => {
      if (node.type === 'Rule' && node.prelude.type === 'SelectorList') {
        const selectors = node.prelude.children
          .toArray()
          .map((selector) => nestedSelector(selector, parents));
        const original = selectors.map((selector) => generate(selector)).join(',');
        const scoped = selectors
          .map((selector) => scopedSelector(clone(selector), scope))
          .join(',');
        let declarations = '';
        const flush = () => {
          if (declarations) output += `${scoped}{${declarations}}`;
          declarations = '';
        };
        node.block.children.forEach((child) => {
          if (child.type === 'Declaration') declarations += `${generate(child)};`;
          else {
            flush();
            output += rules(new List<CssNode>().fromArray([child]), original);
          }
        });
        flush();
      } else if (node.type === 'Atrule') {
        if (node.name === 'import')
          throw new Error('Dictionary CSS imports must be bundled before export');
        if (
          node.block &&
          ['media', 'supports', 'layer', 'container', 'starting-style'].includes(node.name)
        ) {
          output += `@${node.name}${node.prelude ? ` ${generate(node.prelude)}` : ''}{${rules(node.block.children, parents)}}`;
        } else if (
          ['font-face', 'keyframes', '-webkit-keyframes', 'counter-style'].includes(node.name)
        ) {
          output += generate(node);
        } else if (node.name === 'layer' && !node.block) output += generate(node);
        else throw new Error(`Unsupported dictionary CSS @${node.name}`);
      }
    });
    return output;
  }
  if (ast.type !== 'StyleSheet') throw new Error('Invalid dictionary stylesheet');
  // CSS escapes keep literal markup in content strings from closing the style element.
  return rules(ast.children).replace(/<\/style/giu, '\\3c /style');
}

function isDocumentRoot(node: CssNode): boolean {
  if (node.type === 'TypeSelector') return ['html', 'body'].includes(node.name);
  if (node.type !== 'PseudoClassSelector') return false;
  if (node.name === 'root') return true;
  if (!['is', 'where'].includes(node.name) || !node.children) return false;
  const list = node.children.first;
  return (
    list?.type === 'SelectorList' &&
    list.children
      .toArray()
      .every(
        (selector) =>
          selector.type === 'Selector' && selector.children.toArray().some(isDocumentRoot)
      )
  );
}
