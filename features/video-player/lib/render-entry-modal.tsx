import { Ruby } from '@/components/ui/ruby';
import type { StoredDefinition } from '@/db/dictionaries/schema';
import React, { useState } from 'react';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
  type TextStyle,
  type ImageStyle,
} from 'react-native';
import {
  buildFlow,
  groupRubyChildren,
  wrapInlineAtoms,
  type InlineAtom,
  type LayoutNode,
} from './dictionary-flow';
import {
  styleDictionaryTree,
  type StyleEnvironment,
  type Stylesheet,
} from '@/lib/dictionaries/css';
import { cssLength } from '@/lib/dictionaries/native-style';

export interface DictionaryRenderOptions {
  onInternalLink?: (href: string) => void;
  resolveAsset?: (assetPath: string) => string | undefined;
  stylesheet?: Stylesheet;
  environment?: StyleEnvironment;
}

type Child = LayoutNode | string;

export function renderDefinition(
  definition: Extract<StoredDefinition, { type: 'content' }>,
  options: DictionaryRenderOptions = {}
): React.ReactNode {
  const children = options.environment
    ? styleDictionaryTree(definition.children, options.stylesheet ?? [], options.environment)
    : definition.children;
  return renderChildren(children, [], options);
}

function textStyle(ancestors: LayoutNode[], annotation = false): TextStyle {
  const style: TextStyle = { fontSize: annotation ? 10 : 16, lineHeight: annotation ? 14 : 24 };
  for (const node of ancestors) {
    if (node.computed) {
      Object.assign(style, node.computed.text);
      continue;
    }
    if (node.component === 'Link') {
      style.color = '#3b82f6';
      style.textDecorationLine = 'underline';
    }
    if (node.component === 'Summary') style.fontWeight = '600';
    const inline = node.source?.style;
    if (inline?.fontWeight === 'bold' || inline?.fontWeight === 'normal')
      style.fontWeight = inline.fontWeight;
    if (inline?.fontStyle === 'italic' || inline?.fontStyle === 'normal')
      style.fontStyle = inline.fontStyle;
  }
  return style;
}

function linkPress(ancestors: LayoutNode[], options: DictionaryRenderOptions) {
  const link = [...ancestors].reverse().find((node) => node.component === 'Link');
  const href = link?.props.href;
  if (typeof href !== 'string') return undefined;
  return () => {
    if (href.startsWith('?')) options.onInternalLink?.(href);
    else if (/^https?:/u.test(href)) void Linking.openURL(href).catch(console.warn);
  };
}

function renderText(atoms: InlineAtom[], options: DictionaryRenderOptions, annotation: boolean) {
  const nowrap = atoms.every((atom) =>
    ['nowrap', 'pre'].includes(atom.ancestors.at(-1)?.computed?.whiteSpace ?? '')
  );
  return (
    <Text
      numberOfLines={nowrap ? 1 : undefined}
      ellipsizeMode="clip"
      className="text-foreground"
      style={{
        ...textStyle(atoms[0]?.ancestors ?? [], annotation),
        flexShrink: 1,
        maxWidth: '100%',
      }}>
      {atoms.map((atom, index) =>
        atom.kind === 'break' ? (
          '\n'
        ) : atom.kind === 'text' ? (
          <Text
            key={index}
            style={textStyle(atom.ancestors, annotation)}
            onPress={linkPress(atom.ancestors, options)}>
            {atom.text}
          </Text>
        ) : null
      )}
    </Text>
  );
}

function renderImage(node: LayoutNode, options: DictionaryRenderOptions) {
  const assetPath = node.props.assetPath;
  const uri = typeof assetPath === 'string' ? options.resolveAsset?.(assetPath) : undefined;
  const source = uri ?? (typeof node.props.src === 'string' ? node.props.src : undefined);
  if (!source) return null;
  const dimension = (name: 'width' | 'height') => {
    const value = node.props[name];
    if (typeof value !== 'number') return undefined;
    const unit = node.props[`${name}Units`] ?? 'px';
    const env = options.environment;
    const scale = env?.fontScale ?? 1;
    return env
      ? cssLength(`${value}${unit}`, (node.computed?.text.fontSize ?? 16) * scale, {
          ...env,
          fontSize: env.fontSize * scale,
        })
      : value;
  };
  const width = dimension('width') ?? 120;
  const height = dimension('height') ?? 120;
  return (
    <Image
      source={{ uri: source }}
      accessibilityLabel={typeof node.props.alt === 'string' ? node.props.alt : undefined}
      resizeMode="contain"
      style={{ width, height, maxWidth: '100%', ...node.computed?.box } as ImageStyle}
    />
  );
}

function renderInline(
  atoms: InlineAtom[],
  options: DictionaryRenderOptions,
  annotation = false
): React.ReactNode {
  const nowrap = atoms.every((atom) =>
    ['nowrap', 'pre'].includes(atom.ancestors.at(-1)?.computed?.whiteSpace ?? '')
  );
  const pre = atoms.some((atom) => atom.ancestors.at(-1)?.computed?.whiteSpace === 'pre');
  if (!pre && atoms.every((atom) => atom.kind === 'text' || atom.kind === 'break')) {
    return renderText(atoms, options, annotation);
  }
  return (
    <View style={{ alignSelf: 'stretch' }}>
      {wrapInlineAtoms(atoms).map((line, lineIndex) => (
        <View
          key={lineIndex}
          style={{
            flexDirection: 'row',
            flexWrap: nowrap ? 'nowrap' : 'wrap',
            alignItems: 'flex-end',
          }}>
          {line.length === 0
            ? renderText([{ kind: 'text', text: '\u200b', ancestors: [] }], options, annotation)
            : line.map((unit, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    maxWidth: '100%',
                    flexShrink: 0,
                  }}>
                  {unit.every((atom) => atom.kind === 'text')
                    ? renderText(unit, options, annotation)
                    : unit.map((atom, atomIndex) => (
                        <React.Fragment key={atomIndex}>
                          {atom.kind === 'ruby' ? (
                            <Ruby
                              style={atom.ancestors.at(-1)?.computed?.box}
                              groups={[
                                {
                                  base: renderChildren(atom.base, atom.ancestors, options),
                                  annotation: renderChildren(
                                    atom.annotation,
                                    atom.ancestors,
                                    options,
                                    true
                                  ),
                                },
                              ]}
                            />
                          ) : atom.kind === 'box' ? (
                            <View
                              style={{
                                ...atom.node.computed?.box,
                                maxWidth: '100%',
                                alignSelf:
                                  atom.node.computed?.values['vertical-align'] === 'super'
                                    ? 'flex-start'
                                    : 'flex-end',
                              }}>
                              {renderContents(atom.node, atom.ancestors, options, annotation)}
                            </View>
                          ) : atom.kind === 'image' ? (
                            <Pressable onPress={linkPress(atom.ancestors, options)}>
                              {renderImage(atom.node, options)}
                            </Pressable>
                          ) : (
                            renderText([atom], options, annotation)
                          )}
                        </React.Fragment>
                      ))}
                </View>
              ))}
        </View>
      ))}
    </View>
  );
}

function renderChildren(
  children: Child[],
  ancestors: LayoutNode[],
  options: DictionaryRenderOptions,
  annotation = false
): React.ReactNode {
  return buildFlow(children, ancestors).map((segment, index) => (
    <React.Fragment key={index}>
      {segment.kind === 'inline'
        ? renderInline(segment.atoms, options, annotation)
        : renderBlock(segment.node, segment.ancestors, options)}
    </React.Fragment>
  ));
}

function renderBlock(
  node: LayoutNode,
  ancestors: LayoutNode[],
  options: DictionaryRenderOptions
): React.ReactNode {
  const context = [...ancestors, node];
  const children = renderContents(node, context, options);
  const box = node.computed?.box;
  if (node.computed?.display === 'flex') return <View style={box}>{children}</View>;
  if (node.computed?.display === 'list-item')
    return renderListItem(node, ancestors, options, 0, false);
  switch (node.component) {
    case 'List':
      return (
        <View style={{ paddingLeft: 16, marginVertical: 4, ...box }}>
          {node.children.map((child, index) =>
            typeof child !== 'string' && child.component === 'ListItem' ? (
              <React.Fragment key={index}>
                {renderListItem(child, context, options, index, node.props.ordered === true)}
              </React.Fragment>
            ) : (
              <React.Fragment key={index}>
                {renderChildren([child], context, options)}
              </React.Fragment>
            )
          )}
        </View>
      );
    case 'ListItem':
      return renderListItem(node, ancestors, options, 0, false);
    case 'Table':
      return (
        <ScrollView horizontal style={{ maxWidth: '100%' }}>
          <View style={{ marginVertical: 8, ...box }}>{children}</View>
        </ScrollView>
      );
    case 'TableRow':
      return <View style={{ flexDirection: 'row', ...box }}>{children}</View>;
    case 'TableCell':
      return (
        <View
          accessibilityRole={node.props.header ? 'header' : undefined}
          style={{
            flexGrow: typeof node.props.colSpan === 'number' ? node.props.colSpan : 1,
            flexBasis: 0,
            minWidth: 48,
            padding: 4,
            ...box,
          }}>
          {children}
        </View>
      );
    case 'Details':
      return <DictionaryDetails node={node} ancestors={ancestors} options={options} />;
    case 'DictionaryImage':
      return renderImage(node, options);
    case 'Ruby':
      return (
        <View style={box}>
          <Ruby
            groups={groupRubyChildren(node.children).map((group) => ({
              base: renderChildren(group.base, context, options),
              annotation: renderChildren(group.annotation, context, options, true),
            }))}
          />
        </View>
      );
    default:
      return <View style={box}>{children}</View>;
  }
}

function renderContents(
  node: LayoutNode,
  context: LayoutNode[],
  options: DictionaryRenderOptions,
  annotation = false
) {
  if (['flex', 'inline-flex'].includes(node.computed?.display ?? '')) {
    return node.children.map((child, index) => (
      <React.Fragment key={index}>
        {renderChildren([child], context, options, annotation)}
      </React.Fragment>
    ));
  }
  return renderChildren(node.children, context, options, annotation);
}

function renderListItem(
  node: LayoutNode,
  ancestors: LayoutNode[],
  options: DictionaryRenderOptions,
  index: number,
  ordered: boolean
) {
  if (node.computed?.display === 'none') return null;
  if (node.computed && node.computed.display !== 'list-item') {
    return ['inline', 'inline-block', 'inline-flex', 'contents'].includes(node.computed.display) ? (
      renderChildren([node], ancestors, options)
    ) : (
      <View style={node.computed.box}>
        {renderChildren(node.children, [...ancestors, node], options)}
      </View>
    );
  }
  const context = [...ancestors, node];
  const marker = node.computed?.values['list-style-type'] ?? (ordered ? 'decimal' : 'disc');
  const symbol =
    marker === 'none'
      ? ''
      : marker === 'decimal'
        ? `${index + 1}.`
        : marker === 'circle'
          ? '◦'
          : marker === 'square'
            ? '▪'
            : /^['"]/u.test(marker)
              ? marker.slice(1, -1)
              : '•';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', ...node.computed?.box }}>
      {symbol !== '' && <Text style={{ marginRight: 8, ...textStyle(context) }}>{symbol}</Text>}
      <View style={{ flex: 1 }}>{renderChildren(node.children, context, options)}</View>
    </View>
  );
}

function DictionaryDetails({
  node,
  ancestors,
  options,
}: {
  node: LayoutNode;
  ancestors: LayoutNode[];
  options: DictionaryRenderOptions;
}) {
  const [open, setOpen] = useState(node.props.open === true);
  const summary = node.children.find(
    (child) => typeof child !== 'string' && child.component === 'Summary'
  );
  const context = [...ancestors, node];
  return (
    <View style={node.computed?.box}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}>
        {summary ? (
          renderChildren([summary], context, options)
        ) : (
          <Text style={textStyle(context)}>{open ? '▾ Details' : '▸ Details'}</Text>
        )}
      </Pressable>
      {open &&
        renderChildren(
          node.children.filter((child) => child !== summary),
          context,
          options
        )}
    </View>
  );
}
