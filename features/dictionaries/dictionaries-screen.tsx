import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { cssInterop, remapProps } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { DictionariesToolbar } from './components/dictionaries-toolbar';
import { AnchoredMenu, AnchoredMenuItem, AnchoredMenuTrigger } from '@/components/ui/anchored-menu';
import { NOPMutationMapper, useAppLiveQuery } from '@/db/hooks/use-app-live-query';
import {
  deleteDictionaryByIdQuery,
  getDictionariesQuery,
} from '@/db/features/dictionaries/dictionaries.queries';
import { NOPQueryMapper } from '@/db/hooks/use-query';
import { StoredDictionary } from '@/db/dictionaries/schema';
import { useMutation } from '@/db/hooks/use-mutation';
import { cn } from '@/utils/cn';

remapProps(FlatList, {
  className: 'style',
  contentContainerClassName: 'contentContainerStyle',
});

cssInterop(Ionicons, {
  className: {
    target: 'style',
    nativeStyleToProp: { color: true },
  },
});

export const DictionariesScreen = () => {
  const { data: dictionaries, isLoading: isDictionariesLoading } = useAppLiveQuery(
    getDictionariesQuery(),
    NOPQueryMapper
  );

  return (
    <View className="flex-1 bg-background">
      <DictionariesToolbar />
      {isDictionariesLoading ? (
        <Text className="text-foreground">Loading...</Text>
      ) : (
        <FlatList
          data={dictionaries ?? []}
          contentInsetAdjustmentBehavior="automatic"
          className="flex-1"
          contentContainerClassName="p-3"
          renderItem={({ item }) => <DictionaryRow dictionary={item} />}
          keyExtractor={(item) => String(item.id)}
        />
      )}
    </View>
  );
};

const DictionaryRow: React.FC<{ dictionary: StoredDictionary }> = ({ dictionary }) => {
  const { mutate, isPending } = useMutation(deleteDictionaryByIdQuery, NOPMutationMapper);
  return (
    <View
      className={cn(
        'w-full flex-row items-start gap-3 rounded-2xl',
        'border border-border bg-surface p-4'
      )}>
      <Text className="flex-1 text-foreground">{dictionary.title}</Text>
      <AnchoredSettings id={dictionary.id} deleteById={mutate} disabled={isPending} />
    </View>
  );
};

const AnchoredSettings: React.FC<{
  id: number;
  deleteById: (id: number) => void;
  disabled: boolean;
}> = ({ id, disabled, deleteById }) => {
  return (
    <AnchoredMenu>
      <AnchoredMenuTrigger>
        <Ionicons name="ellipsis-vertical" size={18} className="text-mutedForeground" />
      </AnchoredMenuTrigger>
      <AnchoredMenuItem
        icon="trash-outline"
        label="Delete"
        destructive
        disabled={disabled}
        onPress={async () => {
          deleteById(id);
        }}
      />
    </AnchoredMenu>
  );
};
