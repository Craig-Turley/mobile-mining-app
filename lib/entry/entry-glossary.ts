import { generate, List, parse, type CssNode } from 'css-tree';
import type {
  ComponentName,
  ComponentNode,
  StoredDefinition,
} from '@/lib/dictionaries/dictionary-content.types';
import type { Entry } from './entry.types';
import { rewriteCssAssets, scopeDictionaryCss } from './dictionary-css';
import { escapeHtml, exportKey, type ResolveGlossaryAsset } from './html-utils';

const tags: Record<ComponentName, string> = {
  View: 'div',
  Text: 'span',
  Ruby: 'ruby',
  RubyText: 'rt',
  RubyFallback: 'rp',
  List: 'ul',
  ListItem: 'li',
  Table: 'table',
  TableSection: 'tbody',
  TableRow: 'tr',
  TableCell: 'td',
  Link: 'a',
  DictionaryImage: 'img',
  Details: 'details',
  Summary: 'summary',
  LineBreak: 'br',
};
const sourceTags = new Set([...Object.values(tags), 'ol', 'thead', 'tfoot', 'th']);

function attribute(name: string, value: unknown): string {
  return typeof value === 'string' ? ` ${name}="${escapeHtml(value)}"` : '';
}

async function inlineStyle(
  style: Record<string, unknown>,
  scope: string,
  resolveAsset: ResolveGlossaryAsset
): Promise<string> {
  const declarations: CssNode[] = [];
  for (const [key, raw] of Object.entries(style)) {
    const property = key.replace(/[A-Z]/gu, (character) => `-${character.toLowerCase()}`);
    if (!/^(--[\w-]+|[a-z][\w-]*)$/u.test(property))
      throw new Error(`Invalid inline style property: ${key}`);
    let value =
      Array.isArray(raw) && raw.every((part) => typeof part === 'string') ? raw.join(' ') : raw;
    if (typeof value === 'number' && /^margin-(top|right|bottom|left)$/u.test(property))
      value = `${value}em`;
    if (typeof value !== 'string' && typeof value !== 'number') continue;
    const declaration = parse(`${property}:${value}`, { context: 'declaration' });
    declarations.push(declaration);
  }
  const ast: CssNode = {
    type: 'DeclarationList',
    children: new List<CssNode>().fromArray(declarations),
  };
  await rewriteCssAssets(ast, scope, resolveAsset);
  return generate(ast);
}

/** Build browser HTML from the preserved source tree, never from the native layout tree. */
export async function entryToGlossaryHtml(
  entry: Entry,
  css: string,
  resolveAsset: ResolveGlossaryAsset
): Promise<string> {
  const definitions = JSON.parse(entry.definitions_json) as StoredDefinition[];
  if (!Array.isArray(definitions)) throw new Error('Definitions must be an array');
  const scope = `dictionary-${exportKey(`${entry.dictionary}\0${entry.id}\0${entry.definitions_json}\0${css}`)}`;
  async function children(nodes: (ComponentNode | string)[], depth: number): Promise<string> {
    if (!Array.isArray(nodes)) throw new Error('Invalid dictionary children');
    const parts: string[] = [];
    for (const node of nodes) parts.push(await serialize(node, depth));
    return parts.join('');
  }
  async function serialize(node: ComponentNode | string, depth: number): Promise<string> {
    if (depth > 128) throw new Error('Definition nesting exceeds 128 levels');
    if (typeof node === 'string') return escapeHtml(node);
    if (!node || !Object.hasOwn(tags, node.component) || !node.props)
      throw new Error('Invalid dictionary component');
    if (node.component === 'Text' && !node.source) return children(node.children, depth + 1);
    let tag = node.source?.tag ?? tags[node.component];
    if (!node.source) {
      if (node.component === 'List' && node.props.ordered) tag = 'ol';
      if (node.component === 'TableCell' && node.props.header) tag = 'th';
      if (
        node.component === 'TableSection' &&
        ['thead', 'tbody', 'tfoot'].includes(String(node.props.kind))
      )
        tag = String(node.props.kind);
    }
    if (!sourceTags.has(tag)) throw new Error(`Unsupported dictionary tag: ${tag}`);
    const source = node.source as
      (ComponentNode['source'] & { id?: string; class?: string }) | undefined;
    let attributes = attribute(
      'class',
      [`gloss-sc-${tag}`, source?.class ?? node.props.class ?? ''].join(' ').trim()
    );
    const id = source?.id ?? node.props.id;
    if (typeof id === 'string') attributes += attribute('id', `${scope}-${id}`);
    attributes +=
      attribute('lang', source?.lang) + attribute('title', source?.title ?? node.props.title);
    for (const [key, value] of Object.entries(source?.data ?? {})) {
      const name = `data-sc-${key.replace(/[A-Z]/gu, (c) => `-${c.toLowerCase()}`)}`;
      if (/^data-sc-[\w-]+$/u.test(name)) attributes += attribute(name, value);
    }
    const style = { ...source?.style };
    if (tag === 'td' || tag === 'th') {
      for (const key of ['colSpan', 'rowSpan']) {
        const value = node.props[key];
        if (typeof value === 'number' && Number.isInteger(value) && value > 0)
          attributes += attribute(key.toLowerCase(), String(value));
      }
    }
    if (tag === 'details' && node.props.open === true) attributes += ' open';
    if (tag === 'a') {
      let href = node.props.href;
      if (typeof href !== 'string' || !/^(https?:|\?|#)/iu.test(href))
        throw new Error('Unsupported glossary link');
      if (href.startsWith('#')) href = `#${scope}-${href.slice(1)}`;
      attributes += attribute('href', href) + ' rel="noreferrer noopener"';
    }
    if (tag === 'img') {
      const path = node.props.assetPath;
      if (typeof path !== 'string') throw new Error('Dictionary image has no asset path');
      const filename = await resolveAsset(path, 'transformed');
      attributes +=
        attribute('src', filename) +
        attribute('alt', node.props.alt ?? node.props.description ?? '');
      const width = node.props.preferredWidth ?? node.props.width;
      const height = node.props.preferredHeight ?? node.props.height;
      for (const [dimension, value] of [
        ['width', width],
        ['height', height],
      ] as const) {
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
          const unit = node.props[`${dimension}Units`] ?? node.props.sizeUnits ?? 'px';
          if (!['px', 'em', '%'].includes(String(unit)))
            throw new Error('Unsupported image dimension unit');
          Object.assign(style, { [dimension]: `${value}${unit}` });
        }
      }
      if (node.props.imageRendering === 'pixelated' || node.props.pixelated === true)
        Object.assign(style, { imageRendering: 'pixelated' });
      const image = `<img${attributes}${attribute('style', await inlineStyle(style, scope, resolveAsset))}>`;
      const border = await inlineStyle(
        { border: node.props.border, borderRadius: node.props.borderRadius },
        scope,
        resolveAsset
      );
      return `<a class="gloss-image-link" href="${escapeHtml(filename)}"><span class="gloss-image-container"${attribute('style', border)}>${image}</span></a>`;
    }
    if (Object.keys(style).length > 0)
      attributes += attribute('style', await inlineStyle(style, scope, resolveAsset));
    return tag === 'br'
      ? `<br${attributes}>`
      : `<${tag}${attributes}>${await children(node.children, depth + 1)}</${tag}>`;
  }
  const content: string[] = [];
  for (const definition of definitions) {
    if (definition.type === 'deinflection') continue;
    if (definition.type !== 'content') throw new Error('Unsupported dictionary definition');
    const plain = definition.children.every((node) => node.component === 'Text' && !node.source);
    content.push(
      `<section class="structured-content"${plain ? ' style="white-space:pre-wrap"' : ''}>${await children(definition.children, 0)}</section>`
    );
  }
  if (!content.length) return '';
  const base = `
    :where(.${scope}){text-align:left;--text-color:currentColor;--fg:currentColor;--font-size-no-units:20}
    :where(.${scope}) .structured-content+.structured-content{margin-top:.5em}
    :where(.${scope}) table{border-collapse:collapse}
    :where(.${scope}) th,:where(.${scope}) td{border:0 solid currentColor;padding:.2em .4em}
    :where(.${scope}) .gloss-image-container{display:inline-block;max-width:100%;vertical-align:middle}
    :where(.${scope}) img{max-width:100%;object-fit:contain}
  `;
  const stylesheet = generate(parse(base)) + (await scopeDictionaryCss(css, scope, resolveAsset));
  return `<section class="dictionary-glossary ${scope}" data-dictionary="${escapeHtml(entry.dictionary)}"><section class="gloss-content">${content.join('')}</section></section><style>${stylesheet}</style>`;
}
