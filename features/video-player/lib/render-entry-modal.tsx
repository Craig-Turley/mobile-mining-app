import { Ruby } from '@/components/ui/ruby';
import type { ComponentNode, StoredDefinition } from '@/db/dictionaries/schema';
import React from 'react';
import { Image, Linking, Pressable, Text, View, type TextStyle } from 'react-native';
import { buildFlow, wrapInlineAtoms, type InlineAtom } from './dictionary-flow';

export interface DictionaryRenderOptions {
  onInternalLink?: (href: string) => void;
  resolveAsset?: (assetPath: string) => string | undefined;
}

type Child = ComponentNode | string;

export function renderDefinition(
  definition: Extract<StoredDefinition, { type: 'content' }>,
  options: DictionaryRenderOptions = {}
): React.ReactNode {
  return renderChildren(definition.children, [], options);
}

function textStyle(ancestors: ComponentNode[], annotation = false): TextStyle {
  const style: TextStyle = { fontSize: annotation ? 10 : 16, lineHeight: annotation ? 14 : 24 };
  for (const node of ancestors) {
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

function linkPress(ancestors: ComponentNode[], options: DictionaryRenderOptions) {
  const link = [...ancestors].reverse().find((node) => node.component === 'Link');
  const href = link?.props.href;
  if (typeof href !== 'string') return undefined;
  return () => {
    if (href.startsWith('?')) options.onInternalLink?.(href);
    else if (/^https?:/u.test(href)) void Linking.openURL(href).catch(console.warn);
  };
}

function renderText(atoms: InlineAtom[], options: DictionaryRenderOptions, annotation: boolean) {
  return (
    <Text
      className="text-foreground"
      style={{ ...textStyle([], annotation), flexShrink: 1, maxWidth: '100%' }}>
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

function renderImage(node: ComponentNode, options: DictionaryRenderOptions) {
  const assetPath = node.props.assetPath;
  const uri = typeof assetPath === 'string' ? options.resolveAsset?.(assetPath) : undefined;
  const source = uri ?? (typeof node.props.src === 'string' ? node.props.src : undefined);
  if (!source) return null;
  const width = typeof node.props.width === 'number' ? node.props.width : 120;
  const height = typeof node.props.height === 'number' ? node.props.height : 120;
  return (
    <Image
      source={{ uri: source }}
      accessibilityLabel={typeof node.props.alt === 'string' ? node.props.alt : undefined}
      resizeMode="contain"
      style={{ width, height, maxWidth: '100%' }}
    />
  );
}

function renderInline(
  atoms: InlineAtom[],
  options: DictionaryRenderOptions,
  annotation = false
): React.ReactNode {
  if (atoms.every((atom) => atom.kind === 'text' || atom.kind === 'break')) {
    return renderText(atoms, options, annotation);
  }
  return (
    <View style={{ alignSelf: 'stretch' }}>
      {wrapInlineAtoms(atoms).map((line, lineIndex) => (
        <View
          key={lineIndex}
          style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' }}>
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
  ancestors: ComponentNode[],
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
  node: ComponentNode,
  ancestors: ComponentNode[],
  options: DictionaryRenderOptions
): React.ReactNode {
  const context = [...ancestors, node];
  const children = renderChildren(node.children, context, options);
  switch (node.component) {
    case 'List':
      return (
        <View className="my-1 gap-1 pl-4">
          {node.children.map((child, index) =>
            typeof child !== 'string' && child.component === 'ListItem' ? (
              <View key={index} className="flex-row items-start">
                <Text className="mr-2 text-foreground" style={textStyle(context)}>
                  {node.props.ordered ? `${index + 1}.` : '\u2022'}
                </Text>
                <View className="flex-1">
                  {renderChildren(child.children, [...context, child], options)}
                </View>
              </View>
            ) : (
              <React.Fragment key={index}>
                {renderChildren([child], context, options)}
              </React.Fragment>
            )
          )}
        </View>
      );
    case 'ListItem':
      return (
        <View className="flex-row items-start">
          <Text className="mr-2 text-foreground">{'\u2022'}</Text>
          <View className="flex-1">{children}</View>
        </View>
      );
    case 'Table':
      return <View className="my-2 border border-gray-300">{children}</View>;
    case 'TableRow':
      return <View className="flex-row border-b border-gray-300">{children}</View>;
    case 'TableCell':
      return <View className="flex-1 border-r border-gray-300 p-2">{children}</View>;
    case 'Details':
      return <View className="my-2">{children}</View>;
    case 'DictionaryImage':
      return renderImage(node, options);
    default:
      return <View>{children}</View>;
  }
}
