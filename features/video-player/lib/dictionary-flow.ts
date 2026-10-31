import type { ComponentNode } from '@/db/dictionaries/schema';
import type { ComputedStyle } from '@/lib/dictionaries/native-style';

export type LayoutNode = ComponentNode & { computed?: ComputedStyle };
type Child = LayoutNode | string;
export type TextAtom = { kind: 'text'; text: string; ancestors: LayoutNode[] };
export type InlineAtom =
  | TextAtom
  | { kind: 'break'; ancestors: LayoutNode[] }
  | { kind: 'ruby'; base: Child[]; annotation: Child[]; ancestors: LayoutNode[] }
  | { kind: 'box'; node: LayoutNode; ancestors: LayoutNode[] }
  | { kind: 'image'; node: LayoutNode; ancestors: LayoutNode[] };
export type FlowSegment =
  | { kind: 'inline'; atoms: InlineAtom[] }
  | { kind: 'block'; node: LayoutNode; ancestors: LayoutNode[] };

export function groupRubyChildren(children: Child[]) {
  const groups: { base: Child[]; annotation: Child[] }[] = [];
  let base: Child[] = [];
  for (const child of children) {
    if (typeof child !== 'string' && child.component === 'RubyFallback') continue;
    if (typeof child !== 'string' && child.component === 'RubyText') {
      groups.push({ base, annotation: [child] });
      base = [];
    } else {
      base.push(child);
    }
  }
  if (base.length) groups.push({ base, annotation: [] });
  return groups;
}

export function buildFlow(children: Child[], ancestors: LayoutNode[] = []): FlowSegment[] {
  const segments: FlowSegment[] = [];
  function append(atom: InlineAtom) {
    const last = segments[segments.length - 1];
    if (last?.kind === 'inline') last.atoms.push(atom);
    else segments.push({ kind: 'inline', atoms: [atom] });
  }

  function visit(child: Child, parents: LayoutNode[]) {
    if (typeof child === 'string') {
      if (child) append({ kind: 'text', text: child, ancestors: parents });
      return;
    }
    const context = [...parents, child];
    if (child.component === 'RubyFallback') return;
    const display = child.computed?.display ?? child.source?.style?.display;
    if (display === 'none') return;
    if (display === 'contents') {
      child.children.forEach((nested) => visit(nested, context));
      return;
    }
    const inline = display
      ? ['inline', 'inline-block', 'inline-flex', 'contents'].includes(String(display))
      : ['Text', 'Link', 'RubyText', 'Ruby', 'DictionaryImage', 'LineBreak'].includes(
          child.component
        );
    if (!inline) {
      segments.push({ kind: 'block', node: child, ancestors: parents });
    } else if (child.component === 'LineBreak') {
      append({ kind: 'break', ancestors: context });
    } else if (child.component === 'DictionaryImage') {
      append({ kind: 'image', node: child, ancestors: context });
    } else if (child.component === 'Ruby') {
      for (const group of groupRubyChildren(child.children)) {
        if (group.annotation.length) append({ kind: 'ruby', ...group, ancestors: context });
        else group.base.forEach((base) => visit(base, context));
      }
    } else if (child.computed?.inlineBox) {
      append({ kind: 'box', node: child, ancestors: context });
    } else {
      child.children.forEach((nested) => visit(nested, context));
    }
  }

  children.forEach((child) => visit(child, ancestors));
  // HTML whitespace collapses across span boundaries, not separately in each string.
  for (const segment of segments) {
    if (segment.kind !== 'inline') continue;
    let atLineStart = true;
    let space = false;
    for (const atom of segment.atoms) {
      if (atom.kind === 'break') {
        atLineStart = true;
        space = false;
        continue;
      }
      if (atom.kind !== 'text') {
        atLineStart = false;
        space = false;
        continue;
      }
      const mode = atom.ancestors.at(-1)?.computed?.whiteSpace;
      if (!mode || ['pre', 'pre-wrap', 'break-spaces'].includes(mode)) {
        atLineStart = atom.text.endsWith('\n');
        space = /[ \t\r\n\f]$/u.test(atom.text);
        continue;
      }
      atom.text =
        mode === 'pre-line'
          ? atom.text.replace(/[ \t\f]+/gu, ' ').replace(/ *\r?\n */gu, '\n')
          : atom.text.replace(/[ \t\r\n\f]+/gu, ' ');
      if ((atLineStart || space) && atom.text.startsWith(' ')) atom.text = atom.text.slice(1);
      if (atom.text) {
        atLineStart = atom.text.endsWith('\n');
        space = atom.text.endsWith(' ');
      }
    }
    for (let i = segment.atoms.length - 1; i >= 0; i--) {
      const atom = segment.atoms[i];
      if (atom.kind !== 'text') break;
      const mode = atom.ancestors.at(-1)?.computed?.whiteSpace;
      if (!mode || ['pre', 'pre-wrap', 'break-spaces'].includes(mode)) break;
      atom.text = atom.text.replace(/ +$/u, '');
      if (atom.text) break;
    }
    segment.atoms = segment.atoms.filter((a) => a.kind !== 'text' || a.text.length > 0);
  }
  return segments;
}

const opening = /^[（「『【〈《([{‘“]+$/u;
const closing = /^[、。，．！？：；）」』】〉》)\]}’”!?.,:;]+$/u;
const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

export function splitTextForWrapping(text: string): string[] {
  const segments =
    typeof Intl.Segmenter === 'function'
      ? Array.from(
          new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
          (s) => s.segment
        )
      : Array.from(text).reduce<string[]>((parts, character) => {
          if (
            parts.length &&
            (/\p{M}|\p{Emoji_Modifier}|\u200d/u.test(character) ||
              parts[parts.length - 1].endsWith('\u200d') ||
              (/^\p{Regional_Indicator}$/u.test(character) &&
                /^\p{Regional_Indicator}$/u.test(parts[parts.length - 1])))
          ) {
            parts[parts.length - 1] += character;
          } else parts.push(character);
          return parts;
        }, []);
  const chunks: string[] = [];
  let word = '';
  let prefix = '';
  const flush = () => {
    if (word) chunks.push(word);
    word = '';
  };
  for (const [index, character] of segments.entries()) {
    const joinsWord =
      /^['’\-]$/u.test(character) &&
      word &&
      /^[\p{L}\p{N}]/u.test(segments[index + 1] ?? '') &&
      !cjk.test(segments[index + 1]);
    if ((!cjk.test(character) && /^[\p{L}\p{N}\p{M}_]+$/u.test(character)) || joinsWord) {
      word += prefix + character;
      prefix = '';
    } else {
      flush();
      if (opening.test(character)) prefix += character;
      else if (
        closing.test(character) &&
        chunks.length &&
        !/\s$/u.test(chunks[chunks.length - 1])
      ) {
        chunks[chunks.length - 1] += prefix + character;
        prefix = '';
      } else {
        chunks.push(prefix + character);
        prefix = '';
      }
    }
  }
  flush();
  if (prefix) chunks.push(prefix);
  return chunks.reduce<string[]>((result, chunk) => {
    if (
      result.length &&
      (/[\u00a0\u202f]$/u.test(result[result.length - 1]) || /^[\u00a0\u202f]/u.test(chunk))
    ) {
      result[result.length - 1] += chunk;
    } else result.push(chunk);
    return result;
  }, []);
}

export function wrapInlineAtoms(atoms: InlineAtom[]): InlineAtom[][][] {
  const lines: InlineAtom[][][] = [[]];
  let text: TextAtom[] = [];
  const flush = () => {
    if (!text.length) return;
    const chunks = splitTextForWrapping(text.map((atom) => atom.text).join(''));
    let atomIndex = 0;
    let offset = 0;
    for (const chunk of chunks) {
      let remaining = chunk.length;
      const unit: InlineAtom[] = [];
      while (remaining) {
        const atom = text[atomIndex];
        const length = Math.min(remaining, atom.text.length - offset);
        unit.push({ ...atom, text: atom.text.slice(offset, offset + length) });
        remaining -= length;
        offset += length;
        if (offset === atom.text.length) {
          atomIndex++;
          offset = 0;
        }
      }
      lines[lines.length - 1].push(unit);
    }
    text = [];
  };
  for (const atom of atoms) {
    if (atom.kind === 'text') {
      const parts = atom.text.split(/\r\n|[\r\n]/u);
      parts.forEach((part, index) => {
        if (index) {
          flush();
          lines.push([]);
        }
        if (part) text.push({ ...atom, text: part });
      });
    } else {
      flush();
      if (atom.kind === 'break') lines.push([]);
      else lines[lines.length - 1].push([atom]);
    }
  }
  flush();

  return lines.map((line) => {
    const result: InlineAtom[][] = [];
    let prefix: InlineAtom[] = [];
    for (const unit of line) {
      const value = unit.every((a) => a.kind === 'text')
        ? unit.map((a) => (a as TextAtom).text).join('')
        : '';
      const lastUnit = result[result.length - 1];
      const lastAtom = lastUnit?.[lastUnit.length - 1];
      const nonbreaking =
        (lastAtom?.kind === 'text' && /[\u00a0\u202f]$/u.test(lastAtom.text)) ||
        /^[\u00a0\u202f]/u.test(value);
      if (value && opening.test(value)) prefix.push(...unit);
      else if (result.length && (nonbreaking || (value && closing.test(value) && !prefix.length))) {
        result[result.length - 1].push(...prefix, ...unit);
        prefix = [];
      } else {
        result.push([...prefix, ...unit]);
        prefix = [];
      }
    }
    if (prefix.length) result.push(prefix);
    return result;
  });
}
