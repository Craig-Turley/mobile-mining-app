import React from 'react';
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { cn } from '@/utils/cn';

export interface RubyGroup {
  base: React.ReactNode;
  annotation?: React.ReactNode;
}

interface RubyProps {
  children?: React.ReactNode;
  groups?: RubyGroup[];
  className?: string;
  style?: StyleProp<ViewStyle>;
  baseTextStyle?: StyleProp<TextStyle>;
}

interface RubyTextProps {
  children: React.ReactNode;
  className?: string;
}

export function RubyText({ children, className }: RubyTextProps) {
  return <Text className={cn('text-sm', className)}>{children}</Text>;
}

export function Ruby({
  children,
  groups: parsedGroups,
  className,
  style,
  baseTextStyle,
}: RubyProps) {
  // NOTE: this is to get rid of fragments
  const flatten = (children: React.ReactNode): React.ReactNode[] =>
    React.Children.toArray(children).flatMap((child) =>
      React.isValidElement<{ children?: React.ReactNode }>(child) && child.type === React.Fragment
        ? flatten(child.props.children)
        : [child]
    );
  const nodes = flatten(children);

  const groups: {
    base: React.ReactNode[];
    annotation?: React.ReactNode;
  }[] = [];
  let base: React.ReactNode[] = [];

  for (const node of nodes) {
    if (React.isValidElement(node) && node.type === RubyText) {
      groups.push({
        base,
        annotation: node,
      });

      base = [];
    } else {
      base.push(node);
    }
  }

  if (base.length > 0) {
    groups.push({ base });
  }

  return (
    <View className={cn('max-w-full shrink-0 flex-row items-end', className)} style={style}>
      {(parsedGroups ?? groups).map((group, index) => (
        <View key={index} style={{ alignItems: 'center', flexShrink: 1, maxWidth: '100%' }}>
          <View style={{ alignItems: 'center', justifyContent: 'flex-end' }}>
            {group.annotation}
          </View>
          {parsedGroups ? (
            group.base
          ) : (
            <Text style={[{ fontSize: 18 }, baseTextStyle]}>{group.base}</Text>
          )}
        </View>
      ))}
    </View>
  );
}
