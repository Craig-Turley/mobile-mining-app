import React from 'react';
import { View, Text, Pressable, FlatList, Alert } from 'react-native';
import { QueueToolbar } from './components/queue-toolbar';
import { cn } from '@/utils/cn';
import { Ionicons } from '@expo/vector-icons';
import { cssInterop } from 'nativewind';
import { useQueue } from '@/lib/queue-db-hooks';
import { QueueItemWithModel } from '@/db/app/schema';
import Button from '@/components/ui/button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { exportToAnki, prepareDeckForExport } from '@/lib/genanki';
import { getDecks } from '@/db/repositories/decks.repository';
import { getModels } from '@/db/repositories/models.repository';
import * as Sharing from 'expo-sharing';
import { clearQueue } from '@/db/repositories/queue.repository';
import { getAppDefaults } from '@/db/repositories/defaults.repository';

interface QueueScreenProps { }

cssInterop(Ionicons, {
  className: {
    target: 'style',
    nativeStyleToProp: {
      color: true,
    },
  },
});

export const QueueScreen: React.FC<QueueScreenProps> = () => {
  const { queuedItems, isLoading } = useQueue();
  const insets = useSafeAreaInsets();

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
                try {
                  const defaults = await getAppDefaults();
                  const decks = await getDecks();
                  const models = await getModels();

                  const deck = prepareDeckForExport(
                    decks.find(d => d.applicationId == defaults?.deckApplicationId) || decks[0],
                    models,
                    queuedItems,
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
                          await clearQueue();
                        },
                      },
                    ],
                    {
                      cancelable: true,
                    },
                  );
                } catch (error) {
                  console.error('Failed to export Anki deck:', error);
                }
              }}
              disabled={queuedItems.length === 0}
              style={{
                marginBottom: insets.bottom
              }}
            />
          </View>
        </>
      )}
    </View>
  );
};

const QueueRow: React.FC<{ queItem: QueueItemWithModel }> = ({ queItem }) => {
  return (
    <Pressable
      className={cn(
        'w-full flex-row items-start gap-3 rounded-2xl',
        'border border-border bg-surface p-4',
        'active:bg-background/40'
      )}>

      {/*<View className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />*/}

      {/* Main content */}
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="shrink font-semibold text-foreground" numberOfLines={1}>
            {queItem.entry.kanji.map(k => k.text).join(", ")}
          </Text>
        </View>

        <View className="mt-2 flex-row flex-wrap items-center gap-x-3 gap-y-1">
          {/*<View className="flex-row items-center gap-1">
            <Ionicons name="layers-outline" size={12} className="text-mutedForeground" />

            <Text className="text-[11px] text-mutedForeground">
              {fieldCount} field{fieldCount === 1 ? '' : 's'}
            </Text>
          </View>*/}

          {/*<View className="flex-row items-center gap-1">
            <Ionicons name="document-text-outline" size={12} className="text-mutedForeground" />

            <Text className="text-[11px] text-mutedForeground">{templateCount} template</Text>
          </View>*/}
        </View>
      </View>


      {/*<Ionicons name="chevron-forward" size={16} className="mt-1 shrink-0 text-mutedForeground" />*/}
    </Pressable>
  );
};
