import React from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { ModelsToolbar } from './components/models-toolbar';
import { useModels } from '@/lib/model-db-hooks';
import { StoredModel } from '@/db/app/schema/models';
import { cn } from '@/utils/cn';
import { cssInterop, remapProps } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

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

interface ModelsScreenProps {}

export const ModelsScreen: React.FC<ModelsScreenProps> = () => {
  const { models, isLoading } = useModels();

  return (
    <View className="flex-1 bg-background">
      <ModelsToolbar />
      {isLoading ? (
        <View>
          <Text className="text-foreground">Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={models}
          contentInsetAdjustmentBehavior="automatic"
          className="flex-1"
          contentContainerClassName="gap-3 p-3"
          renderItem={({ item }) => <ModelRow storedModel={item} />}
          keyExtractor={(item) => String(item.applicationId)}
        />
      )}
    </View>
  );
};

// const { editModelFormData } = useLocalSearchParams<{
//   editModelFormData?: string;
// }>();
const ModelRow: React.FC<{ storedModel: StoredModel }> = ({ storedModel }) => {
  const model = storedModel.model;

  const fieldCount = model.flds?.length ?? 0;
  const templateCount = model.tmpls?.length ?? 0;

  return (
    <Pressable
      onPress={() => {
        router.push({
          pathname: '/model-create',
          params: {
            editModelFormData: JSON.stringify(storedModel),
          },
        });
      }}
      className={cn(
        'w-full flex-row items-start gap-3 rounded-2xl',
        'border border-border bg-surface p-4',
        'active:bg-background/40'
      )}>
      {/* Accent dot */}
      <View className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />

      {/* Main content */}
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="shrink font-semibold text-foreground" numberOfLines={1}>
            {model.name}
          </Text>

          {/* Optional tag */}
          {model.type ? (
            <View className="bg-primary/15 shrink-0 rounded-full px-2 py-0.5">
              <Text className="text-[9px] font-semibold uppercase tracking-wider text-primary">
                {model.type}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="mt-2 flex-row flex-wrap items-center gap-x-3 gap-y-1">
          <View className="flex-row items-center gap-1">
            <Ionicons name="layers-outline" size={12} className="text-mutedForeground" />

            <Text className="text-[11px] text-mutedForeground">
              {fieldCount} field{fieldCount === 1 ? '' : 's'}
            </Text>
          </View>

          <View className="flex-row items-center gap-1">
            <Ionicons name="document-text-outline" size={12} className="text-mutedForeground" />

            <Text className="text-[11px] text-mutedForeground">{templateCount} template</Text>
          </View>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} className="mt-1 shrink-0 text-mutedForeground" />
    </Pressable>
  );
};
