import React from 'react';
import { Text, View } from 'react-native';

type Node =
  | string
  | Node[]
  | {
      tag: string;
      content?: Node;
      href?: string;
      path?: string;
    };

function Ruby({ base, reading }: { base: React.ReactNode; reading: React.ReactNode }) {
  return (
    <View style={{ alignItems: 'center', marginHorizontal: 1 }}>
      <Text style={{ fontSize: 10, lineHeight: 12 }}>{reading}</Text>
      <Text>{base}</Text>
    </View>
  );
}

export function renderStructuredContent(node: Node, key = 'root'): React.ReactNode {
  if (typeof node === 'string') {
    return node;
  }

  if (Array.isArray(node)) {
    return node.map((child, i) => (
      <React.Fragment key={`${key}-${i}`}>
        {renderStructuredContent(child, `${key}-${i}`)}
      </React.Fragment>
    ));
  }

  const children = renderStructuredContent(node.content ?? '', `${key}-c`);

  switch (node.tag) {
    case 'br':
      return '\n';

    case 'ruby': {
      const parts = Array.isArray(node.content) ? node.content : [node.content];
      const rt = parts.find((x: any) => x?.tag === 'rt');
      const base = parts.filter((x: any) => x?.tag !== 'rt' && x?.tag !== 'rp');

      return (
        <Ruby
          key={key}
          base={base.map((x, i) => renderStructuredContent(x as Node, `${key}-b-${i}`))}
          reading={rt ? renderStructuredContent((rt as any).content ?? '', `${key}-rt`) : ''}
        />
      );
    }

    case 'rt':
    case 'rp':
      return null;

    case 'ul':
    case 'ol':
      return <View key={key}>{children}</View>;

    case 'li':
      return (
        <Text key={key}>
          {'• '}
          {children}
        </Text>
      );

    case 'div':
    case 'p':
      return <Text key={key}>{children}</Text>;

    case 'span':
    case 'summary':
      return <Text key={key}>{children}</Text>;

    case 'details':
      return <View key={key}>{children}</View>;

    case 'table':
    case 'thead':
    case 'tbody':
    case 'tfoot':
    case 'tr':
    case 'td':
    case 'th':
      return <Text key={key}>{children}</Text>;

    case 'a':
      return <Text key={key}>{children}</Text>;

    case 'img':
      return null;

    default:
      return <Text key={key}>{children}</Text>;
  }
}

function DefinitionView({ definition }: { definition: any }) {
  if (typeof definition === 'string') {
    return <Text>{definition}</Text>;
  }

  if (definition.type === 'text') {
    return <Text>{definition.text}</Text>;
  }

  if (definition.type === 'structured-content') {
    return <View>{renderStructuredContent(definition.content)}</View>;
  }

  return null;
}
