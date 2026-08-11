import React, { useState } from 'react';
import Button from '@/components/ui/button';
import { View, Text, FlatList, Alert } from 'react-native';
import { QueueToolbar } from './components/queue-toolbar';
import { cn } from '@/utils/cn';
import { Ionicons } from '@expo/vector-icons';
import { cssInterop } from 'nativewind';
import { QueueItemWithModel } from '@/db/app/schema';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAppDefaultsQuery } from '@/db/features/defaults/defaults.queries';
import { NOPQueryMapper } from '@/db/hooks/use-query';
import { useAppLiveQuery } from '@/db/hooks/use-app-live-query';
import { allQueueItemsQuery, clearQueueQuery, deleteFromQueueQuery } from '@/db/features/queue/queue.queries';
import { AnchoredMenu, AnchoredMenuItem, AnchoredMenuTrigger } from '@/components/ui/anchored-menu';
import { CustomExportModal } from './components/custom-export-modal';
import { exportQueueToAnki } from './lib/export-to-anki';

cssInterop(Ionicons, {
  className: {
    target: 'style',
    nativeStyleToProp: {
      color: true,
    },
  },
});

export const QueueScreen: React.FC = () => {
  const { data: queuedItems, isLoading } = useAppLiveQuery(allQueueItemsQuery(), NOPQueryMapper);
  const { data: defaults } = useAppLiveQuery(getAppDefaultsQuery(), NOPQueryMapper);
  const insets = useSafeAreaInsets();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const exportFunc = async (deckId: number) => {
    try {
      await exportQueueToAnki(deckId, queuedItems);

      Alert.alert(
        'Clear export queue?',
        'Would you like to remove the exported entries from the queue?',
        [
          {
            text: 'No',
            style: 'cancel',
          },
          {
            text: 'Yes',
            style: 'destructive',
            onPress: clearQueueQuery,
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Failed to export Anki deck:', error);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <QueueToolbar />
      {isLoading ? (
        <View>
          <Text className="text-foreground">Loading...</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={queuedItems}
            contentInsetAdjustmentBehavior="automatic"
            className="flex-1"
            contentContainerClassName="gap-3 p-3"
            renderItem={({ item }) => <QueueRow queItem={item} />}
            keyExtractor={(item) => String(item.applicationId)}
          />
          <View className="shrink-0 bg-background px-4 pb-4 pt-3">
            <Button
              label="Export"
              onPress={async () => {
                setIsModalOpen(true);
              }}
              disabled={queuedItems.length === 0}
              style={{
                marginBottom: insets.bottom,
              }}
            />
          </View>

          <CustomExportModal
            visible={isModalOpen}
            initialDeckApplicationId={defaults[0]?.deckApplicationId ?? null}
            close={() => setIsModalOpen(false)}
            isSubmitting={false}
            onClose={() => { }}
            onSubmit={exportFunc}
          />
        </>
      )}
    </View>
  );
};

const QueueRow: React.FC<{ queItem: QueueItemWithModel }> = ({ queItem }) => {
  const title = queItem.entry.kanji.map((kanji) => kanji.text).join(', ');
  const model = queItem.model.name;

  return (
    <View
      className={cn(
        'w-full flex-row items-start gap-3 rounded-2xl',
        'border border-border bg-surface p-4'
      )}>
      <View className="min-w-0 flex-1 gap-2 active:opacity-70">
        <Text className="shrink font-semibold text-foreground" numberOfLines={1}>
          {title}
        </Text>

        <View className="flex-row items-center gap-1">
          <Ionicons
            name="layers"
            size={14}
            className="text-mutedForeground"
          />

          <Text
            className="shrink text-sm text-mutedForeground"
            numberOfLines={1}
          >
            {model}
          </Text>
        </View>
      </View>

      <AnchoredMenu>
        <AnchoredMenuTrigger className="shrink-0" accessibilityLabel={`Open actions for ${title}`}>
          <Ionicons name="ellipsis-vertical" size={18} className="text-mutedForeground" />
        </AnchoredMenuTrigger>

        <AnchoredMenuItem
          icon="trash-outline"
          label="Delete"
          destructive
          onPress={async () => deleteFromQueueQuery(queItem.applicationId)}
        />
      </AnchoredMenu>
    </View>
  );
};
