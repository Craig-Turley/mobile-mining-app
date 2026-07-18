import React from 'react';
import { View, Text } from 'react-native';
import { DecksToolbar } from './components/decks-toolbar';
import { cn } from '@/utils/cn';

interface DecksScreenProps {}

export const DecksScreen: React.FC<DecksScreenProps> = () => {
  return (
    <View className="flex-1 bg-background">
      <DecksToolbar />
    </View>
  );
};

const DeckRow = () => {
  return (
    <View
      className={cn(
        'relative rounded-2xl border bg-surface p-5 transition-colors',
        'w-full flex-1 items-start gap-3 text-left'
      )}>
      <Text className="text-foreground"></Text>
    </View>
  );
};
