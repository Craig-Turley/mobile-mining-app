import React, { useState } from 'react';
import { View, Text, Pressable, FlatList, Alert } from 'react-native';
import { QueueToolbar } from './components/queue-toolbar';
import { cn } from '@/utils/cn';
import { Ionicons } from '@expo/vector-icons';
import { cssInterop } from 'nativewind';
import { QueueItemWithModel, StoredModel } from '@/db/app/schema';
import Button from '@/components/ui/button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { exportToAnki, prepareDeckForExport } from '@/lib/genanki';
import { allModelsQuery } from '@/db/features/models/models.queries';
import * as Sharing from 'expo-sharing';
import { allDecksQuery } from '@/db/features/decks/decks.queries';
import { getAppDefaultsQuery } from '@/db/features/defaults/defaults.queries';
import { Model } from '@/packages/genanki-ts/dist';
import { AllowedModelField } from '@/lib/flash-card';
import { NOPQueryMapper } from '@/db/hooks/use-query';
import { useAppLiveQuery } from '@/db/hooks/use-app-live-query';
import { allQueueItemsQuery, clearQueueQuery, deleteFromQueueQuery } from '@/db/features/queue/queue.queries';
import { AnchoredMenu, AnchoredMenuItem, AnchoredMenuTrigger } from '@/components/ui/anchored-menu';
import { CustomExportModal } from './components/custom-export-modal';

interface QueueScreenProps { }

cssInterop(Ionicons, {
  className: {
    target: 'style',
    nativeStyleToProp: {
      color: true,
    },
  },
});

// TODO: move this into a db function
export function hydrateStoredModel(storedModel: StoredModel): StoredModel {
  return {
    ...storedModel,
    model: new Model<AllowedModelField[]>({
      id: storedModel.model.id,
      name: storedModel.model.name,
      type: storedModel.model.type,
      mod: storedModel.model.mod,
      usn: storedModel.model.usn,
      sortf: storedModel.model.sortf,
      did: storedModel.model.did,
      flds: storedModel.model.flds,
      tmpls: storedModel.model.tmpls,
      css: storedModel.model.css,
      latexPre: storedModel.model.latexPre,
      latexPost: storedModel.model.latexPost,
      latexsvg: storedModel.model.latexsvg,
      req: storedModel.model.req,
      vers: storedModel.model.vers,
      originalStockKind: storedModel.model.originalStockKind,
      originalId: storedModel.model.originalId,
    }),
  };
}

export const QueueScreen: React.FC<QueueScreenProps> = () => {
  const { data: queuedItems, isLoading } = useAppLiveQuery(allQueueItemsQuery(), NOPQueryMapper);
  const { data: defaults } = useAppLiveQuery(getAppDefaultsQuery(), NOPQueryMapper);
  const insets = useSafeAreaInsets();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const exportFunc = async (deckId: number) => {
    try {
      const decks = await allDecksQuery();
      const models = await allModelsQuery().then((m) => m.map(hydrateStoredModel));
      const selectedDeck = decks.find((d) => d.applicationId == deckId);

      if (!selectedDeck) { throw new Error("selected deck not found") }

      const deck = prepareDeckForExport(
        selectedDeck,
        models,
        queuedItems
      );

      const fileUri = await exportToAnki(deck);
      const sharingAvailable = await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        throw new Error('File sharing is not available on this device.');
      }

      await Sharing.shareAsync(fileUri, {
        dialogTitle: 'Open Anki deck',
        mimeType: 'application/octet-stream',
        UTI: 'public.data',
      });

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
            onPress: async () => {
              await clearQueueQuery();
            },
          },
        ],
        {
          cancelable: true,
        }
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
            initialDeckApplicationId={defaults[0].deckApplicationId}
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

  return (
    <View
      className={cn(
        'w-full flex-row items-start gap-3 rounded-2xl',
        'border border-border bg-surface p-4'
      )}>
      <Pressable
        className="min-w-0 flex-1 active:opacity-70"
        accessibilityRole="button">
        <Text
          className="shrink font-semibold text-foreground"
          numberOfLines={1}>
          {title}
        </Text>
      </Pressable>

      <AnchoredMenu>
        <AnchoredMenuTrigger
          className="shrink-0"
          accessibilityLabel={`Open actions for ${title}`}>
          <Ionicons
            name="ellipsis-vertical"
            size={18}
            className="text-mutedForeground"
          />
        </AnchoredMenuTrigger>

        <AnchoredMenuItem
          icon="trash-outline"
          label="Delete"
          destructive
          onPress={async () =>
            deleteFromQueueQuery(queItem.applicationId)
          }
        />
      </AnchoredMenu>
    </View>
  );
};
