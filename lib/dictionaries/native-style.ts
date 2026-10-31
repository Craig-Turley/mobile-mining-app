import { generate, lexer, parse } from 'css-tree';
import type { TextStyle, ViewStyle } from 'react-native';
import type { ComponentNode } from '@/db/dictionaries/schema';
import type { StyleEnvironment } from './css';
import { cssDiagnostic } from './diagnostics';

export interface ComputedStyle {
  display: string;
  whiteSpace: string;
  text: TextStyle;
  box: ViewStyle;
  values: Record<string, string>;
  variables: Record<string, string>;
  inlineBox: boolean;
}

/** Split tokens without breaking functions, quoted markers, or calc expressions. */
export function cssTokens(value: string): string[] {
  try {
    const ast = parse(value, { context: 'value' });
    return ast.type === 'Value' ? ast.children.toArray().map((n) => generate(n)) : [value];
  } catch {
    return [value];
  }
}

export function expandDeclaration(property: string, value: string): [string, string][] {
  const logical = property.match(/^(margin|padding)-(inline|block)$/u);
  if (logical) {
    const [start, end = start] = cssTokens(value);
    return [
      [`${logical[1]}-${logical[2] === 'inline' ? 'left' : 'top'}`, start],
      [`${logical[1]}-${logical[2] === 'inline' ? 'right' : 'bottom'}`, end],
    ];
  }
  if (property === 'font') {
    const tokens = cssTokens(value);
    const size = tokens.findIndex((v) => /^[\d.]+(px|em|rem|%)$/u.test(v));
    if (size < 0) return [];
    const prefix = tokens.slice(0, size);
    const line = tokens[size + 1] === '/';
    return [
      ['font-style', prefix.includes('italic') ? 'italic' : 'normal'],
      ['font-weight', prefix.find((v) => /^(bold|[1-9]00)$/u.test(v)) ?? 'normal'],
      ['font-size', tokens[size]],
      ['line-height', line ? tokens[size + 2] : 'normal'],
      ['font-family', tokens.slice(size + (line ? 3 : 1)).join(' ')],
    ];
  }
  if (/^(margin|padding|border-width|border-color|border-style)$/u.test(property)) {
    const tokens = cssTokens(value);
    if (tokens.length < 1 || tokens.length > 4) return [];
    const [a, b = a, c = a, d = b] = tokens;
    return ['top', 'right', 'bottom', 'left'].map((side, i) => [
      property.startsWith('border-')
        ? `border-${side}-${property.slice(7)}`
        : `${property}-${side}`,
      [a, b, c, d][i],
    ]);
  }
  if (/^border(?:-(top|right|bottom|left))?$/u.test(property)) {
    const tokens = cssTokens(value);
    const width = tokens.find((v) => /^(thin|medium|thick|[\d.])/u.test(v)) ?? 'medium';
    const style =
      tokens.find((v) =>
        /^(none|hidden|solid|dashed|dotted|double|groove|ridge|inset|outset)$/u.test(v)
      ) ?? 'none';
    const color = tokens.find((v) => v !== width && v !== style) ?? 'currentColor';
    const sides = property === 'border' ? ['top', 'right', 'bottom', 'left'] : [property.slice(7)];
    return sides.flatMap(
      (side) =>
        [
          [`border-${side}-width`, width],
          [`border-${side}-style`, style],
          [`border-${side}-color`, color],
        ] as [string, string][]
    );
  }
  if (property === 'background') {
    const tokens = cssTokens(value);
    const color = tokens.find(
      (v) =>
        /^(#|rgb|hsl|color-mix|transparent$|[a-z]+$)/iu.test(v) &&
        !['none', 'repeat', 'scroll', 'fixed', 'center', 'cover'].includes(v)
    );
    return [['background-color', color ?? 'transparent']];
  }
  if (property === 'list-style') {
    return [
      [
        'list-style-type',
        cssTokens(value).find((v) => !['inside', 'outside'].includes(v)) ?? 'disc',
      ],
    ];
  }
  return [[property, value]];
}

export function resolveCssVariables(
  value: string,
  vars: Record<string, string>,
  seen = new Set<string>()
): string | undefined {
  let output = '';
  let quote = '';
  for (let i = 0; i < value.length; i++) {
    const character = value[i];
    if (character === '\\') {
      output += value.slice(i, i + 2);
      i++;
      continue;
    }
    if (quote) {
      output += character;
      if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      output += character;
      continue;
    }
    if (!value.startsWith('var(', i)) {
      output += character;
      continue;
    }
    let depth = 1;
    let end = i + 4;
    let comma = -1;
    let innerQuote = '';
    for (; end < value.length; end++) {
      const c = value[end];
      if (c === '\\') {
        end++;
        continue;
      }
      if (innerQuote) {
        if (c === innerQuote) innerQuote = '';
        continue;
      }
      if (c === '"' || c === "'") innerQuote = c;
      else if (c === '(') depth++;
      else if (c === ')' && --depth === 0) break;
      else if (c === ',' && depth === 1 && comma < 0) comma = end;
    }
    if (depth !== 0) return undefined;
    const name = value.slice(i + 4, comma < 0 ? end : comma).trim();
    if (!/^--[\w-]+$/u.test(name)) return undefined;
    const next = new Set(seen);
    next.add(name);
    const resolved =
      seen.has(name) || vars[name] === undefined
        ? undefined
        : resolveCssVariables(vars[name], vars, next);
    const replacement =
      resolved ??
      (comma < 0 ? undefined : resolveCssVariables(value.slice(comma + 1, end).trim(), vars, seen));
    if (replacement === undefined) return undefined;
    output += replacement;
    i = end;
  }
  return output;
}

export function computeVariables(
  declarations: Record<string, string>,
  inheritedVars: Record<string, string>
): Record<string, string> {
  const raw = { ...inheritedVars };
  const own = Object.keys(declarations).filter((key) => key.startsWith('--'));
  for (const key of own) {
    const value = declarations[key];
    if (value === 'initial') delete raw[key];
    else if (value === 'inherit' || value === 'unset') {
      if (inheritedVars[key] === undefined) delete raw[key];
    } else raw[key] = value;
  }
  const result = { ...inheritedVars };
  for (const key of own) {
    const value =
      raw[key] === undefined ? undefined : resolveCssVariables(raw[key], raw, new Set([key]));
    if (value === undefined) delete result[key];
    else result[key] = value;
  }
  return result;
}

/** Numeric CSS lengths in native density-independent units. No eval or browser APIs. */
export function cssLength(
  value: string,
  fontSize: number,
  env: StyleEnvironment,
  percentBase = fontSize
): number | undefined {
  const input = value.trim().toLowerCase();
  const scalar = input.match(/^(-?[\d.]+)(px|em|rem|%|vw|vh)?$/u);
  if (scalar) {
    const n = Number(scalar[1]);
    const factor =
      scalar[2] === 'em'
        ? fontSize
        : scalar[2] === 'rem'
          ? env.fontSize
          : scalar[2] === '%'
            ? percentBase / 100
            : scalar[2] === 'vw'
              ? env.width / 100
              : scalar[2] === 'vh'
                ? env.height / 100
                : 1;
    return Number.isFinite(n * factor) ? n * factor : undefined;
  }
  if (!input.startsWith('calc(') || !input.endsWith(')')) return undefined;
  const tokens = input.slice(5, -1).match(/(?:\d*\.)?\d+(?:px|rem|em|vw|vh|%)?|[()+*/-]/gu) ?? [];
  if (tokens.join('') !== input.slice(5, -1).replace(/\s/gu, '')) return undefined;
  let index = 0;
  function atom(): number {
    const token = tokens[index++];
    if (token === '-') return -atom();
    if (token === '+') return atom();
    if (token === '(') {
      const n = sum();
      if (tokens[index++] !== ')') return NaN;
      return n;
    }
    return cssLength(token ?? '', fontSize, env, percentBase) ?? NaN;
  }
  function product(): number {
    let n = atom();
    while (tokens[index] === '*' || tokens[index] === '/') {
      const op = tokens[index++];
      const right = atom();
      n = op === '*' ? n * right : n / right;
    }
    return n;
  }
  function sum(): number {
    let n = product();
    while (tokens[index] === '+' || tokens[index] === '-') {
      const op = tokens[index++];
      const right = product();
      n = op === '+' ? n + right : n - right;
    }
    return n;
  }
  const result = sum();
  return index === tokens.length && Number.isFinite(result) ? result : undefined;
}

const colors: Record<string, string> = {
  transparent: '#00000000',
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  brown: '#a52a2a',
  purple: '#800080',
  orange: '#ffa500',
  goldenrod: '#daa520',
  crimson: '#dc143c',
  lime: '#00ff00',
  gray: '#808080',
  grey: '#808080',
  yellow: '#ffff00',
  navy: '#000080',
  teal: '#008080',
  silver: '#c0c0c0',
  maroon: '#800000',
  olive: '#808000',
  aqua: '#00ffff',
  fuchsia: '#ff00ff',
  rebeccapurple: '#663399',
};

function channels(value: string): number[] | undefined {
  const color = colors[value.toLowerCase()] ?? value;
  if (/^#[\da-f]{3,8}$/iu.test(color)) {
    const hex = color.slice(1);
    const expanded = hex.length <= 4 ? [...hex].map((v) => v + v).join('') : hex;
    if (expanded.length !== 6 && expanded.length !== 8) return;
    return [0, 2, 4, 6].map((i) =>
      i === 6
        ? expanded.length === 8
          ? parseInt(expanded.slice(i, i + 2), 16) / 255
          : 1
        : parseInt(expanded.slice(i, i + 2), 16)
    );
  }
  const rgb = color.match(/^rgba?\(([^)]+)\)$/u);
  if (rgb) {
    const values = rgb[1].split(/\s*[,/]\s*|\s+/u).filter(Boolean);
    if (values.length < 3) return;
    const result = values
      .slice(0, 3)
      .map((v) => parseFloat(v) * (v.endsWith('%') ? 2.55 : 1))
      .concat(
        values[3] === undefined ? 1 : parseFloat(values[3]) / (values[3].endsWith('%') ? 100 : 1)
      );
    return result.every(Number.isFinite) ? result : undefined;
  }
}

export function cssColor(value: string, current: string): string | undefined {
  value = value.trim();
  if (value.toLowerCase() === 'currentcolor') return current;
  if (value.startsWith('color-mix(')) {
    // Native fallback supports the sRGB mixing used by Jitendex, with premultiplied alpha.
    const parts = value.slice(10, -1).split(/,(?![^()]*\))/u);
    if (parts.length !== 3 || !/^\s*in srgb\s*$/u.test(parts[0])) return;
    const stops = parts.slice(1).map((part) => {
      const match = part.trim().match(/^(.*?)(?:\s+([\d.]+)%)?$/u)!;
      return {
        rgba: channels(cssColor(match[1], current) ?? ''),
        weight: match[2] === undefined ? undefined : Number(match[2]) / 100,
      };
    });
    if (!stops[0].rgba || !stops[1].rgba) return;
    const a = stops[0].weight ?? (stops[1].weight === undefined ? 0.5 : 1 - stops[1].weight);
    const b = stops[1].weight ?? 1 - a;
    const total = a + b;
    if (total <= 0) return;
    const x = a / total;
    const y = b / total;
    const alpha = stops[0].rgba[3] * x + stops[1].rgba[3] * y;
    const rgb = [0, 1, 2].map((i) =>
      alpha === 0
        ? 0
        : Math.round(
            (stops[0].rgba![i] * stops[0].rgba![3] * x +
              stops[1].rgba![i] * stops[1].rgba![3] * y) /
              alpha
          )
    );
    return `rgba(${rgb.join(',')},${alpha * Math.min(1, total)})`;
  }
  if (value.includes('gradient(')) {
    const stop = value.match(/(?:gradient\([^,]*,|gradient\()\s*([a-z]+|#[\da-f]+)/iu)?.[1];
    return stop ? cssColor(stop, current) : undefined;
  }
  const rgba = channels(value);
  if (rgba)
    return value.startsWith('rgb')
      ? `rgba(${rgba
          .slice(0, 3)
          .map((v) => Math.max(0, Math.min(255, Math.round(v))))
          .join(',')},${Math.max(0, Math.min(1, rgba[3]))})`
      : (colors[value.toLowerCase()] ?? value);
  // RN also supports hsl() and the full CSS named-color set.
  if (
    (/^hsla?\(/u.test(value) || /^[a-z]+$/iu.test(value)) &&
    lexer.matchProperty('color', value).matched
  )
    return value;
}

const inherited = [
  'color',
  'font-size',
  'font-weight',
  'font-style',
  'font-family',
  'line-height',
  'text-align',
  'white-space',
  'list-style-type',
  'visibility',
  'letter-spacing',
  'text-decoration-line',
];

export function computeNativeStyle(
  declarations: Record<string, string>,
  parent: ComputedStyle | undefined,
  node: Pick<ComponentNode, 'component' | 'props' | 'source'>,
  env: StyleEnvironment
): ComputedStyle {
  const vars = computeVariables(
    declarations,
    parent?.variables ?? {
      '--text-color': env.color,
      '--fg': env.color,
      '--font-size-no-units': String(env.fontSize),
    }
  );
  const initial: Record<string, string> = {
    color: env.color,
    'font-size': `${env.fontSize}px`,
    'font-weight': 'normal',
    'font-style': 'normal',
    'line-height': 'normal',
    'text-align': 'left',
    'white-space': 'normal',
    visibility: 'visible',
    'letter-spacing': 'normal',
    display: 'inline',
  };
  const values: Record<string, string> = {};
  for (const key of inherited)
    if (parent?.values[key] !== undefined) values[key] = parent.values[key];
  if (node.component === 'Link') {
    values.color = '#3b82f6';
    values['text-decoration-line'] = 'underline';
  }
  if (node.component === 'Summary') values['font-weight'] = '600';
  if (node.component === 'TableCell' && node.props.header) values['font-weight'] = 'bold';
  if (!parent && !node.source) values['white-space'] = 'pre-wrap';
  Object.entries(declarations).forEach(([key, raw]) => {
    if (key.startsWith('--')) return;
    const value = resolveCssVariables(raw, vars)?.trim();
    if (value === 'inherit' || (value === 'unset' && inherited.includes(key))) {
      if (parent?.values[key] !== undefined) values[key] = parent.values[key];
      else if (initial[key]) values[key] = initial[key];
      else delete values[key];
    } else if (value === 'initial' || value === 'unset') {
      if (initial[key]) values[key] = initial[key];
      else delete values[key];
    } else if (value !== undefined) values[key] = value;
  });
  const defaultInline = [
    'Text',
    'Link',
    'Ruby',
    'RubyText',
    'DictionaryImage',
    'LineBreak',
  ].includes(node.component);
  let display =
    values.display ??
    (defaultInline ? 'inline' : node.component === 'ListItem' ? 'list-item' : 'block');
  if (node.component === 'RubyFallback') display = 'none';
  const parentSize = parent?.text.fontSize ?? env.fontSize;
  // Resolve font-size only when specified locally; inherited em sizes must not multiply twice.
  const ownSize = declarations['font-size'];
  const size =
    ownSize && values['font-size']
      ? (cssLength(values['font-size'], parentSize, env, parentSize) ?? parentSize)
      : parentSize;
  values['font-size'] = `${size}px`;
  const color =
    cssColor(values.color ?? env.color, String(parent?.text.color ?? env.color)) ?? env.color;
  values.color = color;
  const text: TextStyle = {
    fontSize: size,
    color,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
  };
  const box: ViewStyle = {};
  if (display === 'flex' || display === 'inline-flex') box.flexDirection = 'row';
  // Native Text scales fonts automatically; scale font-relative box lengths to match.
  const scale = env.fontScale ?? 1;
  const length = (value: string) =>
    cssLength(
      value,
      size * scale,
      { ...env, fontSize: env.fontSize * scale },
      env.contentWidth ?? env.width
    );
  for (const [key, value] of Object.entries(values)) {
    if (/^(margin|padding)-(top|right|bottom|left)$/u.test(key)) {
      const name = key.replace(/-([a-z])/gu, (_, c: string) => c.toUpperCase());
      const n = length(value);
      if (n !== undefined) Object.assign(box, { [name]: n });
    } else if (/^border-(top|right|bottom|left)-(width|color|style)$/u.test(key)) {
      const [, side, kind] = key.split('-');
      const name = `border${side[0].toUpperCase()}${side.slice(1)}${kind[0].toUpperCase()}${kind.slice(1)}`;
      if (kind === 'width') {
        const n =
          ({ thin: 1, medium: 3, thick: 5 } as Record<string, number>)[value] ?? length(value);
        if (n !== undefined) Object.assign(box, { [name]: n });
      } else if (kind === 'color') {
        const c = cssColor(value, color);
        if (c) Object.assign(box, { [name]: c });
      } else if (value === 'none' || value === 'hidden')
        Object.assign(box, { [`border${side[0].toUpperCase()}${side.slice(1)}Width`]: 0 });
      else if (['solid', 'dashed', 'dotted'].includes(value))
        box.borderStyle = value as ViewStyle['borderStyle'];
    } else if (key === 'background-color') {
      const c = cssColor(value, color);
      if (c) box.backgroundColor = c;
    } else if (key === 'border-radius') {
      const n = length(cssTokens(value)[0]);
      if (n !== undefined) box.borderRadius = n;
    } else if (/^(width|height|min-width|max-width|min-height|max-height)$/u.test(key)) {
      const name = key.replace(/-([a-z])/gu, (_, c: string) => c.toUpperCase());
      const n = /^\d+(\.\d+)?%$/u.test(value) ? value : length(value);
      if (n !== undefined) Object.assign(box, { [name]: n });
      else if (key === 'width' && value === 'fit-content') box.alignSelf = 'flex-start';
    } else if (key === 'font-weight' && /^(normal|bold|[1-9]00)$/u.test(value))
      text.fontWeight = value as TextStyle['fontWeight'];
    else if (key === 'font-style' && ['normal', 'italic'].includes(value))
      text.fontStyle = value as TextStyle['fontStyle'];
    else if (key === 'font-family')
      text.fontFamily = value
        .split(',')[0]
        .trim()
        .replace(/^['"]|['"]$/gu, '');
    else if (key === 'text-align' && ['left', 'right', 'center', 'justify', 'auto'].includes(value))
      text.textAlign = value as TextStyle['textAlign'];
    else if (key === 'text-decoration' || key === 'text-decoration-line') {
      if (['none', 'underline', 'line-through', 'underline line-through'].includes(value))
        text.textDecorationLine = value as TextStyle['textDecorationLine'];
    } else if (key === 'letter-spacing') {
      const n = cssLength(value, size, env);
      if (n !== undefined) text.letterSpacing = n;
    } else if (key === 'opacity') {
      const n = Number(value);
      if (Number.isFinite(n)) box.opacity = Math.max(0, Math.min(1, n));
    } else if (
      key === 'flex-direction' &&
      ['row', 'row-reverse', 'column', 'column-reverse'].includes(value)
    )
      box.flexDirection = value as ViewStyle['flexDirection'];
    else if (key === 'flex-wrap' && ['wrap', 'nowrap', 'wrap-reverse'].includes(value))
      box.flexWrap = value as ViewStyle['flexWrap'];
    else if (
      key === 'align-items' &&
      ['flex-start', 'flex-end', 'center', 'stretch', 'baseline'].includes(value)
    )
      box.alignItems = value as ViewStyle['alignItems'];
    else if (
      key === 'justify-content' &&
      [
        'flex-start',
        'flex-end',
        'center',
        'space-between',
        'space-around',
        'space-evenly',
      ].includes(value)
    )
      box.justifyContent = value as ViewStyle['justifyContent'];
    else if (key === 'gap' || key === 'row-gap' || key === 'column-gap') {
      const n = length(value);
      if (n !== undefined)
        Object.assign(box, { [key.replace(/-([a-z])/gu, (_, c: string) => c.toUpperCase())]: n });
    }
  }
  // Unitless line heights inherit as factors, lengths inherit as absolute values.
  const line = values['line-height'];
  text.lineHeight =
    line && line !== 'normal'
      ? ((/^[\d.]+$/u.test(line) ? Number(line) * size : cssLength(line, size, env)) ?? size * 1.5)
      : size * 1.5;
  if (line && /(?:em|rem|%|calc\()/u.test(line)) values['line-height'] = `${text.lineHeight}px`;
  if (text.letterSpacing !== undefined) values['letter-spacing'] = `${text.letterSpacing}px`;
  if (node.component === 'Summary' && !values['font-weight']) text.fontWeight = '600';
  if (values.visibility === 'hidden') box.opacity = 0;
  for (const side of ['top', 'right', 'bottom', 'left']) {
    if (['none', 'hidden'].includes(values[`border-${side}-style`]))
      Object.assign(box, { [`border${side[0].toUpperCase()}${side.slice(1)}Width`]: 0 });
  }
  for (const property of Object.keys(declarations)) {
    if (
      [
        'clip-path',
        'text-emphasis-style',
        'position',
        'float',
        'grid-template-columns',
        'transform',
      ].includes(property)
    )
      cssDiagnostic(`Unsupported ${property}; using native content layout`);
    if (
      (property === 'background' || property === 'background-color') &&
      declarations[property].includes('gradient(')
    )
      cssDiagnostic('Gradients use a solid-color fallback');
  }
  if (node.component === 'RubyText' && !ownSize) {
    text.fontSize = size * 0.6;
    text.lineHeight = size * 0.8;
    values['font-size'] = `${size * 0.6}px`;
  }
  return {
    display,
    whiteSpace: values['white-space'] ?? 'normal',
    text,
    box,
    values,
    variables: vars,
    inlineBox:
      display === 'inline-block' ||
      display === 'inline-flex' ||
      Object.keys(box).length > 0 ||
      values['vertical-align'] === 'super' ||
      values['vertical-align'] === 'sub',
  };
}
