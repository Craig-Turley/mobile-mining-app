import { Button } from '@/components/ui/button';
import { allDecksQuery } from '@/db/features/decks/decks.queries';
import { useAppLiveQuery } from '@/db/hooks/use-app-live-query';
import { NOPQueryMapper } from '@/db/hooks/use-query';
import { useAppTheme } from '@/theme/theme-provider';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';

interface CustomExportModalProps {
  visible: boolean;
  initialDeckApplicationId?: number | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (deckApplicationId: number) => void | Promise<void>;
}

export function CustomExportModal({
  visible,
  initialDeckApplicationId,
  isSubmitting = false,
  onClose,
  onSubmit,
}: CustomExportModalProps) {
  const { colors } = useAppTheme();

  const {
    data: decks,
    isLoading,
    error,
  } = useAppLiveQuery(allDecksQuery(), NOPQueryMapper, []);

  const [userSelectedDeckId, setUserSelectedDeckId] = useState<number | null>(null);

  const selectedDeckId =
    decks?.find((deck) => deck.applicationId === userSelectedDeckId)?.applicationId ??
    decks?.find((deck) => deck.applicationId === initialDeckApplicationId)?.applicationId ??
    decks?.[0]?.applicationId ??
    null;

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }
    onClose();
  };

  const handleSelectDeck = (deckApplicationId: number) => {
    setUserSelectedDeckId(deckApplicationId);
  };

  const handleSubmit = async () => {
    if (
      selectedDeckId == null ||
      isSubmitting ||
      isLoading ||
      error != null ||
      !decks?.some((deck) => deck.applicationId === selectedDeckId)
    ) {
      return;
    }

    onClose();
    await onSubmit(selectedDeckId);
  };

  return (
    <Modal
      visible={visible}
      animationType='fade'
      transparent
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}>
      <View className="flex-1 justify-center px-6">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close export modal"
          className="absolute inset-0 bg-black/60"
          disabled={isSubmitting}
          onPress={handleClose}
        />

        <View
          accessibilityViewIsModal
          className="overflow-hidden rounded-3xl border border-border bg-surface">
          <View className="flex-row items-center justify-between border-b border-border px-5 py-4">
            <View className="flex-1">
              <Text className="text-xl font-bold text-foreground">Export</Text>

              <Text className="mt-1 text-sm text-mutedForeground">
                Select a destination deck. Each entry uses the model chosen when it was queued.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={12}
              disabled={isSubmitting}
              className="ml-4 h-10 w-10 items-center justify-center rounded-full bg-muted"
              onPress={handleClose}>
              <Ionicons name="close" size={22} color={colors.foreground} />
            </Pressable>
          </View>

          <View className="px-5 py-5">
            <Text className="mb-2 text-sm font-semibold text-foreground">Deck</Text>

            {isLoading || (visible && decks == null && error == null) ? (
              <View className="items-center justify-center rounded-2xl border border-border bg-background py-8">
                <ActivityIndicator color={colors.foreground} />

                <Text className="mt-3 text-sm text-mutedForeground">Loading decks…</Text>
              </View>
            ) : error != null ? (
              <View className="rounded-2xl border border-border bg-background px-4 py-8">
                <Text className="text-center font-semibold text-foreground">
                  Could not load decks
                </Text>
                <Text className="mt-1 text-center text-sm text-mutedForeground">
                  {error instanceof Error ? error.message : 'Close this dialog and try again.'}
                </Text>
              </View>
            ) : decks == null || decks.length === 0 ? (
              <View className="items-center rounded-2xl border border-border bg-background px-4 py-8">
                <Ionicons name="warning-outline" size={26} color={colors.foreground} />

                <Text className="mt-3 text-center font-semibold text-foreground">
                  No decks are available
                </Text>

                <Text className="mt-1 text-center text-sm text-mutedForeground">
                  Create a deck in the Decks screen before exporting the queue.
                </Text>
              </View>
            ) : (
              <View className="mt-2 max-h-56 overflow-hidden rounded-2xl border border-border bg-background">
                <ScrollView
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={decks.length > 4}>
                  {decks.map((deck, index) => {
                    const isSelected = deck.applicationId === selectedDeckId;

                    return (
                      <Pressable
                        key={deck.applicationId}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected: isSelected,
                        }}
                        className={`min-h-14 flex-row items-center px-4 py-3 ${index !== decks.length - 1 ? 'border-b border-border' : ''
                          }`}
                        onPress={() => {
                          handleSelectDeck(deck.applicationId);
                        }}>
                        <Text
                          numberOfLines={2}
                          className={`flex-1 text-base ${isSelected ? 'font-semibold text-primary' : 'text-foreground'
                            }`}>
                          {deck.deckFormData.name}
                        </Text>

                        {isSelected && (
                          <Ionicons name="checkmark" size={21} color={colors.primary} />
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>

          <View className="flex-row gap-3 border-t border-border px-5 py-4">
            <View className="flex-1">
              <Button
                label="Cancel"
                variant="secondary"
                disabled={isSubmitting}
                onPress={handleClose}
              />
            </View>

            <View className="flex-1">
              <Button
                label={isSubmitting ? 'Exporting…' : 'Export'}
                disabled={
                  selectedDeckId == null ||
                  decks == null ||
                  decks.length === 0 ||
                  isLoading ||
                  isSubmitting ||
                  error != null ||
                  !decks.some((deck) => deck.applicationId === selectedDeckId)
                }
                onPress={handleSubmit}
              />
            </View>
          </View>

          {isSubmitting && (
            <View className="bg-surface/70 absolute inset-0 items-center justify-center">
              <ActivityIndicator color={colors.foreground} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
