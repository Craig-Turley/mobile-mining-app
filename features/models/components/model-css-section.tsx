import { View, ViewProps, Text, TextInput, Pressable } from 'react-native';
import { useState } from 'react';
import { DEFAULT_CSS } from '@/lib/flash-card';

export interface ModelCssSectionProps extends ViewProps { }

export default function ModelCssSection({ className, ...rest }: ModelCssSectionProps) {
  const [css, setCss] = useState<string>(DEFAULT_CSS);

  return (
    <View className="gap-2 overflow-hidden px-3" {...rest}>
      <View className="w-full flex-1 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-foreground">Custom CSS</Text>
        <Pressable onPress={() => setCss(DEFAULT_CSS)}>
          <Text className="uppercase tracking-wider text-primary">Reset</Text>
        </Pressable>
      </View>
      <TextInput
        value={css}
        onChangeText={setCss}
        multiline
        autoCorrect={false}
        spellCheck={false}
        textAlignVertical="top"
        className="border-border/60 h-72 w-full rounded-xl border bg-surface p-3 font-mono text-[11px] leading-relaxed text-foreground"
        placeholderTextColor="#888"
      />
    </View>
  );
}
//
