import React from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { DecksToolbar } from './components/decks-toolbar';
import { cn } from '@/utils/cn';
import { cssInterop, remapProps } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { NewDeckModalProvider } from './contexts/new-deck-modal-context';
import { StoredDeck } from '@/db/app/schema';
import { AnchoredMenu, AnchoredMenuItem, AnchoredMenuTrigger } from '@/components/ui/anchored-menu';
import { allDecksQuery, deleteDeckQuery } from '@/db/features/decks/decks.queries';
import { NOPMutationMapper, useAppLiveQuery } from '@/db/hooks/use-app-live-query';
import { getAppDefaultsQuery, setDefaultDeckQuery } from '@/db/features/defaults/defaults.queries';

remapProps(FlatList, {
  className: 'style',
  contentContainerClassName: 'contentContainerStyle',
});

cssInterop(Ionicons, {
  className: {
    target: 'style',
    nativeStyleToProp: {
      color: true,
    },
  },
});

interface DecksScreenProps {}

export const DecksScreen: React.FC<DecksScreenProps> = () => {
  const { data: decks, isLoading: isDecksLoading } = useAppLiveQuery(
    allDecksQuery(),
    NOPMutationMapper
  );

  const { data: defaults } = useAppLiveQuery(getAppDefaultsQuery(), (rows) => rows[0] ?? null);

  return (
    <NewDeckModalProvider>
      <View className="flex-1 bg-background">
        <DecksToolbar />
        {isDecksLoading ? (
          <View>
            <Text className="text-foreground">Loading...</Text>
          </View>
        ) : (
          <FlatList
            data={decks}
            contentInsetAdjustmentBehavior="automatic"
            className="flex-1"
            contentContainerClassName="gap-3 p-3"
            renderItem={({ item }) => (
              <DeckRow deck={item} isDefault={defaults?.deckApplicationId === item.applicationId} />
            )}
            keyExtractor={(item) => String(item.applicationId)}
          />
        )}
      </View>
    </NewDeckModalProvider>
  );
};

const DeckRow: React.FC<{ deck: StoredDeck; isDefault: boolean }> = ({ deck, isDefault }) => {
  return (
    <Pressable
      className={cn(
        'w-full flex-row items-start gap-3 rounded-2xl',
        'border border-border bg-surface p-4',
        'active:bg-background/40'
      )}>
      {/*<View className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" /> */}

      <View className="min-w-0 flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <Text className="shrink font-semibold text-foreground" numberOfLines={1}>
            {deck.deck.name}
          </Text>
          {isDefault ? (
            <View className="bg-primary/15 shrink-0 rounded-full px-2 py-0.5">
              <Text className="text-[9px] font-semibold text-primary">Default</Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row items-center gap-2">
          <Text className="shrink text-mutedForeground" numberOfLines={1}>
            {deck.deck.description.length > 0 ? deck.deck.description : 'No Description'}
          </Text>
        </View>

        <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
          {/*<View className="flex-row items-center gap-1">
            <Ionicons name="layers-outline" size={12} className="text-mutedForeground" />

            <Text className="text-[11px] text-mutedForeground">
              {"100"} cards{1 === 1 ? '' : 's'}
            </Text>
          </View>*/}

          {/*
          <View className="flex-row items-center gap-1">
            <Ionicons name="document-text-outline" size={12} className="text-mutedForeground" />

            <Text className="text-[11px] text-mutedForeground">{"2"} template</Text>
          </View>
          */}
        </View>
      </View>

      <AnchoredMenu>
        <AnchoredMenuTrigger accessibilityLabel={`Open actions for ${deck.deck.name}`}>
          <Ionicons name="ellipsis-vertical" size={18} className="text-mutedForeground" />
        </AnchoredMenuTrigger>

        <AnchoredMenuItem
          icon="checkmark-circle-outline"
          label="Set as default"
          onPress={async () => setDefaultDeckQuery(deck.applicationId)}
        />

        <AnchoredMenuItem
          icon="trash-outline"
          label="Delete"
          destructive
          onPress={async () => deleteDeckQuery(deck.applicationId)}
        />
      </AnchoredMenu>
    </Pressable>
  );
};
