import { compile } from 'css-select';
import { clone, generate, lexer, parse, walk, type CssNode } from 'css-tree';
import type { ComponentNode } from '@/db/dictionaries/schema';
import {
  computeNativeStyle,
  computeVariables,
  expandDeclaration,
  resolveCssVariables,
  type ComputedStyle,
} from './native-style';
import { cssDiagnostic } from './diagnostics';
export { cssDiagnostic } from './diagnostics';

export interface StyleEnvironment {
  width: number;
  height: number;
  fontSize: number;
  color: string;
  dark: boolean;
  fontScale?: number;
  contentWidth?: number;
}

export interface StyledNode extends Omit<ComponentNode, 'children'> {
  children: (StyledNode | string)[];
  computed: ComputedStyle;
}

type Element = {
  tag: string;
  attributes: Record<string, string>;
  parent: Element | null;
  children: Element[];
  text: string;
};
type ElementAdapter = NonNullable<
  NonNullable<Parameters<typeof compile<Element, Element>>[1]>['adapter']
>;
const adapter: ElementAdapter = {
  isTag: (node): node is Element => node.tag !== '#text' && node.tag !== '#root',
  getAttributeValue: (node, name) => node.attributes[name],
  hasAttrib: (node, name) => name in node.attributes,
  getChildren: (node) => node.children,
  getName: (node) => node.tag,
  getParent: (node) => node.parent,
  getSiblings: (node) => node.parent?.children ?? [node],
  getText: (node): string => node.text + node.children.map(adapter.getText).join(''),
  removeSubsets: (nodes) =>
    nodes.filter((node) => {
      for (let parent = node.parent; parent; parent = parent.parent) {
        if (nodes.includes(parent)) return false;
      }
      return true;
    }),
};

type Declaration = { property: string; value: string; important: boolean };
type Specificity = [number, number, number, number];
type Rule = {
  matches: (element: Element) => boolean;
  specificity: Specificity;
  declarations: Declaration[];
  media: string[];
  pseudo?: 'before' | 'after';
};
export type Stylesheet = Rule[];

function compare(a: number[], b: number[]) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

// Functional selector specificity follows Selectors 4, including zero-weight :where().
function specificity(node: CssNode): Specificity {
  const result: Specificity = [0, 0, 0, 0];
  function visit(n: CssNode) {
    if (n.type === 'IdSelector') result[1]++;
    else if (n.type === 'ClassSelector' || n.type === 'AttributeSelector') result[2]++;
    else if (n.type === 'TypeSelector' && n.name !== '*') result[3]++;
    else if (n.type === 'PseudoElementSelector') result[3]++;
    else if (n.type === 'PseudoClassSelector') {
      if (['before', 'after', 'first-line', 'first-letter'].includes(n.name)) {
        result[3]++;
        return;
      }
      if (n.name === 'where') return;
      if (['is', 'not', 'has'].includes(n.name) && n.children) {
        const list = n.children.first;
        if (list?.type === 'SelectorList') {
          const max = list.children.toArray().map(specificity).sort(compare).pop();
          if (max)
            max.forEach((v, i) => {
              result[i] += v;
            });
        }
      } else result[2]++;
    } else if ('children' in n && n.children) n.children.forEach(visit);
  }
  visit(node);
  return result;
}

export function compileCSS(css: string): Stylesheet {
  const ast = parse(css);
  const rules: Rule[] = [];
  function visit(node: CssNode, media: string[], parents?: string) {
    if (node.type === 'Atrule') {
      if (node.name === 'media' && node.block) {
        const condition = node.prelude ? generate(node.prelude) : '';
        node.block.children.forEach((child) => visit(child, [...media, condition], parents));
      } else cssDiagnostic(`Unsupported @${node.name}; conditional rules skipped`);
      return;
    }
    if (node.type !== 'Rule' || node.prelude.type !== 'SelectorList') return;
    const selectors = node.prelude.children.toArray().map((original) => {
      if (!parents) return original;
      const selector = clone(original);
      const replacement = parse(`:is(${parents})`, { context: 'selector' });
      let nested = false;
      walk(selector, (part) => {
        if (
          part.type === 'NestingSelector' &&
          replacement.type === 'Selector' &&
          replacement.children.first
        ) {
          Object.assign(part, clone(replacement.children.first));
          nested = true;
        }
      });
      return nested
        ? selector
        : parse(`:is(${parents}) ${generate(selector)}`, { context: 'selector' });
    });
    let declarations: Declaration[] = [];
    function flush() {
      if (!declarations.length) return;
      const group = declarations;
      declarations = [];
      selectors.forEach((selector) => {
        let text = generate(selector);
        const pseudo = text.match(/::?(before|after)$/u)?.[1] as Rule['pseudo'];
        if (pseudo) text = text.replace(/::?(before|after)$/u, '') || '*';
        try {
          rules.push({
            matches: compile(text, { adapter, cacheResults: false, xmlMode: true }),
            specificity: specificity(selector),
            declarations: group,
            media,
            pseudo,
          });
        } catch {
          cssDiagnostic(`Unsupported selector: ${text}`);
        }
      });
    }
    node.block.children.forEach((child) => {
      if (child.type === 'Declaration')
        declarations.push({
          property: child.property,
          value: generate(child.value),
          important: Boolean(child.important),
        });
      else {
        flush();
        // Compatibility with already-imported schema-2 dictionaries that copied raw CSS.
        visit(child, media, selectors.map((s) => generate(s)).join(','));
      }
    });
    flush();
  }
  if (ast.type === 'StyleSheet') ast.children.forEach((node) => visit(node, []));
  return rules;
}

/** Unknown conditions fail closed, rather than accidentally applying desktop rules. */
export function matchesMedia(query: string, env: StyleEnvironment): boolean {
  return query.split(',').some((branch) => {
    let text = branch.trim().toLowerCase();
    let invert = false;
    if (text.startsWith('not ')) {
      invert = true;
      text = text.slice(4);
    }
    text = text.replace(/^only\s+/u, '');
    const tests: boolean[] = [];
    let unknown = false;
    text = text.replace(/\(([^()]+)\)/gu, (_, raw: string) => {
      const condition = raw.trim();
      const feature = condition.match(/^(min-|max-)?(width|height)\s*:\s*([\d.]+)(px|em|rem)$/u);
      const range = condition.match(/^(width|height)\s*(<=|>=|<|>|=)\s*([\d.]+)(px|em|rem)$/u);
      if (feature) {
        const value = Number(feature[3]) * (feature[4] === 'px' ? 1 : 16);
        const actual = feature[2] === 'width' ? env.width : env.height;
        tests.push(
          feature[1] === 'min-'
            ? actual >= value
            : feature[1] === 'max-'
              ? actual <= value
              : actual === value
        );
      } else if (range) {
        const actual = range[1] === 'width' ? env.width : env.height;
        const value = Number(range[3]) * (range[4] === 'px' ? 1 : 16);
        tests.push(
          range[2] === '<='
            ? actual <= value
            : range[2] === '>='
              ? actual >= value
              : range[2] === '<'
                ? actual < value
                : range[2] === '>'
                  ? actual > value
                  : actual === value
        );
      } else if (/^prefers-color-scheme\s*:\s*(dark|light)$/u.test(condition)) {
        tests.push(condition.endsWith(env.dark ? 'dark' : 'light'));
      } else if (/^orientation\s*:\s*(portrait|landscape)$/u.test(condition)) {
        tests.push(condition.endsWith(env.width > env.height ? 'landscape' : 'portrait'));
      } else {
        unknown = true;
        cssDiagnostic(`Unsupported media condition: ${condition}`);
      }
      return '';
    });
    text = text.replace(/\band\b/gu, '').trim();
    if (!['', 'screen', 'all', 'print'].includes(text)) unknown = true;
    if (unknown) return false;
    tests.push(text === '' || text === 'screen' || text === 'all');
    const result = tests.every(Boolean);
    return invert ? !result : result;
  });
}

function sourceTree(children: ComponentNode[]) {
  const root: Element = { tag: '#root', attributes: {}, parent: null, children: [], text: '' };
  const elements = new Map<ComponentNode, Element>();
  function visit(child: ComponentNode | string, parent: Element) {
    if (typeof child === 'string') {
      parent.children.push({ tag: '#text', attributes: {}, parent, children: [], text: child });
      return;
    }
    if (!child.source) {
      child.children.forEach((c) => visit(c, parent));
      return;
    }
    const attributes: Record<string, string> = {};
    for (const [key, value] of Object.entries(child.source.data ?? {}))
      attributes[`data-sc-${key}`] = value;
    for (const key of ['id', 'class', 'lang', 'title', 'href'] as const) {
      const value = child.source[key as keyof typeof child.source] ?? child.props[key];
      if (typeof value === 'string') attributes[key] = value;
    }
    if (child.props.open === true) attributes.open = '';
    const element: Element = { tag: child.source.tag, attributes, parent, children: [], text: '' };
    parent.children.push(element);
    elements.set(child, element);
    child.children.forEach((c) => visit(c, element));
  }
  children.forEach((child) => visit(child, root));
  return elements;
}

export function styleDictionaryTree(
  children: ComponentNode[],
  sheet: Stylesheet,
  env: StyleEnvironment
): StyledNode[] {
  const elements = sourceTree(children);
  const active = sheet.filter((rule) => rule.media.every((m) => matchesMedia(m, env)));
  function cascade(node: ComponentNode, parent?: ComputedStyle, pseudo?: Rule['pseudo']) {
    const winners = new Map<string, { value: string; priority: number[] }>();
    const candidates: { declaration: Declaration; weight: Specificity; order: number }[] = [];
    function apply(declaration: Declaration, weight: Specificity, order: number) {
      if (
        !declaration.property.startsWith('--') &&
        !declaration.value.includes('var(') &&
        !lexer.matchProperty(declaration.property, declaration.value).matched
      ) {
        cssDiagnostic(
          `Invalid or unsupported declaration: ${declaration.property}: ${declaration.value}`
        );
        return;
      }
      candidates.push({ declaration, weight, order });
    }
    function resolve(
      declaration: Declaration,
      weight: Specificity,
      order: number,
      vars?: Record<string, string>
    ) {
      const resolved = vars
        ? (resolveCssVariables(declaration.value, vars) ?? 'unset').trim()
        : declaration.value;
      for (const [property, value] of expandDeclaration(declaration.property, resolved)) {
        const priority = [Number(declaration.important), ...weight, order];
        const previous = winners.get(property);
        if (!previous || compare(priority, previous.priority) >= 0)
          winners.set(property, { value, priority });
      }
    }
    const element = elements.get(node);
    if (element)
      active.forEach((rule, index) => {
        if (rule.pseudo === pseudo && rule.matches(element))
          rule.declarations.forEach((d) => apply(d, rule.specificity, index));
      });
    if (!pseudo)
      Object.entries(node.source?.style ?? {}).forEach(([key, value], index) => {
        const property = key.replace(/[A-Z]/gu, (c) => `-${c.toLowerCase()}`);
        // Yomitan structured-content directional margins are numbers in em.
        const css =
          typeof value === 'number' && /^margin-(top|right|bottom|left)$/u.test(property)
            ? `${value}em`
            : String(value);
        apply(
          {
            property,
            value: css.replace(/\s*!important\s*$/u, ''),
            important: /!important\s*$/u.test(css),
          },
          [1, 0, 0, 0],
          active.length + index
        );
      });
    for (const { declaration, weight, order } of candidates)
      if (declaration.property.startsWith('--')) resolve(declaration, weight, order);
    const vars = computeVariables(
      Object.fromEntries([...winners].map(([key, entry]) => [key, entry.value])),
      parent?.variables ?? {
        '--text-color': env.color,
        '--fg': env.color,
        '--font-size-no-units': String(env.fontSize),
      }
    );
    for (const { declaration, weight, order } of candidates)
      if (!declaration.property.startsWith('--')) resolve(declaration, weight, order, vars);
    return Object.fromEntries([...winners].map(([key, entry]) => [key, entry.value]));
  }
  function visit(node: ComponentNode, parent?: ComputedStyle): StyledNode {
    const computed = computeNativeStyle(cascade(node, parent), parent, node, env);
    const styled: StyledNode = { ...node, computed, children: [] };
    function generated(pseudo: 'before' | 'after') {
      const declarations = cascade(node, computed, pseudo);
      if (!declarations.content) return;
      const style = computeNativeStyle(
        declarations,
        computed,
        { component: 'Text', props: {} },
        env
      );
      const content = style.values.content;
      if (!content || content === 'none' || content === 'normal') return;
      try {
        const ast = parse(content, { context: 'value' });
        let text = '';
        if (ast.type === 'Value')
          ast.children.forEach((part) => {
            if (part.type === 'String') text += part.value;
            else if (part.type === 'Function' && part.name === 'attr') {
              const name = generate(part).slice(5, -1).trim();
              text += elements.get(node)?.attributes[name] ?? '';
            } else cssDiagnostic(`Unsupported generated content: ${content}`);
          });
        styled.children.push({ component: 'Text', props: {}, children: [text], computed: style });
      } catch {
        cssDiagnostic(`Invalid generated content: ${content}`);
      }
    }
    generated('before');
    styled.children.push(
      ...node.children.map((child) => (typeof child === 'string' ? child : visit(child, computed)))
    );
    generated('after');
    return styled;
  }
  return children.map((node) => visit(node));
}
