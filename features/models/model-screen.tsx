import React from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { ModelsToolbar } from './components/models-toolbar';
import { StoredModel } from '@/db/app/schema/models';
import { cn } from '@/utils/cn';
import { cssInterop, remapProps } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AnchoredMenu, AnchoredMenuItem, AnchoredMenuTrigger } from '@/components/ui/anchored-menu';
import { getAppDefaultsQuery, setDefaultModelQuery } from '@/db/features/defaults/defaults.queries';
import { useAppLiveQuery } from '@/db/hooks/use-app-live-query';
import { allModelsQuery, deleteModelQuery } from '@/db/features/models/models.queries';
import { NOPQueryMapper } from '@/db/hooks/use-query';

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
  const { data: models, isLoading } = useAppLiveQuery(allModelsQuery(), NOPQueryMapper);
  const { data: defaults } = useAppLiveQuery(getAppDefaultsQuery(), (rows) => rows[0] ?? null);

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
          renderItem={({ item }) => (
            <ModelRow
              storedModel={item}
              isDefault={defaults?.modelApplicationId === item.applicationId}
            />
          )}
          keyExtractor={(item) => String(item.applicationId)}
        />
      )}
    </View>
  );
};

// const { editModelFormData } = useLocalSearchParams<{
//   editModelFormData?: string;
// }>();
const ModelRow: React.FC<{
  storedModel: StoredModel;
  isDefault: boolean;
}> = ({ storedModel, isDefault }) => {
  const fieldCount = storedModel.model.flds?.length ?? 0;
  const templateCount = storedModel.model.tmpls?.length ?? 0;

  const editModel = () => {
    router.push({
      pathname: '/model-create',
      params: {
        editModelFormData: JSON.stringify(storedModel),
      },
    });
  };

  return (
    <View
      className={cn(
        'w-full flex-row items-start gap-3 rounded-2xl',
        'border border-border bg-surface p-4'
      )}>
      <Pressable onPress={editModel} className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="shrink font-semibold text-foreground" numberOfLines={1}>
            {storedModel.model.name}
          </Text>

          {isDefault ? (
            <View className="bg-primary/15 shrink-0 rounded-full px-2 py-0.5">
              <Text className="text-[9px] font-semibold text-primary">Default</Text>
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

            <Text className="text-[11px] text-mutedForeground">
              {templateCount} template
              {templateCount === 1 ? '' : 's'}
            </Text>
          </View>
        </View>
      </Pressable>

      <AnchoredMenu>
        <AnchoredMenuTrigger
          className="shrink-0"
          accessibilityLabel={`Open actions for ${storedModel.model.name}`}>
          <Ionicons name="ellipsis-vertical" size={18} className="text-mutedForeground" />
        </AnchoredMenuTrigger>

        <AnchoredMenuItem
          icon="checkmark-circle-outline"
          label="Set as default"
          onPress={async () => setDefaultModelQuery(storedModel.applicationId)}
        />

        <AnchoredMenuItem
          icon="trash-outline"
          label="Delete"
          destructive
          onPress={async () => deleteModelQuery(storedModel.applicationId)}
        />
      </AnchoredMenu>
    </View>
  );
};
