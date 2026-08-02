import Button from '@/components/ui/button';
import { allDecksQuery } from '@/db/features/decks/decks.queries';
import { NOPQueryMapper, useQuery } from '@/db/hooks/use-query';
import { useAppTheme } from '@/theme/theme-provider';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';

interface CustomExportModalProps {
  visible: boolean;
  close: () => void;
  initialDeckApplicationId?: number | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (modelApplicationId: number) => void | Promise<void>;
}

export function CustomExportModal({
  visible,
  close,
  initialDeckApplicationId,
  isSubmitting = false,
  onClose,
  onSubmit,
}: CustomExportModalProps) {
  const { colors } = useAppTheme();

  const { data: decks, isLoading } = useQuery(allDecksQuery, NOPQueryMapper, []);

  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(
    initialDeckApplicationId ?? null
  );

  useEffect(() => {
    if (!visible || decks == null) {
      return;
    }

    const initialDeckExists =
      initialDeckApplicationId != null &&
      decks.some((model) => model.applicationId === initialDeckApplicationId);

    if (initialDeckExists) {
      setSelectedDeckId(initialDeckApplicationId);
      return;
    }

    setSelectedDeckId(decks[0]?.applicationId ?? null);
  }, [visible, initialDeckApplicationId, decks]);

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    onClose();
    close();
  };

  const handleSelectDeck = (modelApplicationId: number) => {
    setSelectedDeckId(modelApplicationId);
  };

  const handleSubmit = async () => {
    if (selectedDeckId == null || isSubmitting) {
      return;
    }

    close();
    await onSubmit(selectedDeckId);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}>
      <View className="flex-1 justify-center px-6">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close custom add modal"
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
                Select the deck you want to export to.
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

            {isLoading ? (
              <View className="items-center justify-center rounded-2xl border border-border bg-background py-8">
                <ActivityIndicator color={colors.foreground} />

                <Text className="mt-3 text-sm text-mutedForeground">Loading models…</Text>
              </View>
            ) : decks == null || decks.length === 0 ? (
              <View className="items-center rounded-2xl border border-border bg-background px-4 py-8">
                <Ionicons name="warning-outline" size={26} color={colors.foreground} />

                <Text className="mt-3 text-center font-semibold text-foreground">
                  No models are available
                </Text>

                <Text className="mt-1 text-center text-sm text-mutedForeground">
                  Create a model before adding this entry.
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
                        className={`min-h-14 flex-row items-center px-4 py-3 ${
                          index !== decks.length - 1 ? 'border-b border-border' : ''
                        }`}
                        onPress={() => {
                          handleSelectDeck(deck.applicationId);
                        }}>
                        <Text
                          numberOfLines={2}
                          className={`flex-1 text-base ${
                            isSelected ? 'font-semibold text-primary' : 'text-foreground'
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
                label={isSubmitting ? 'Adding…' : 'Add'}
                disabled={
                  selectedDeckId == null ||
                  decks == null ||
                  decks.length === 0 ||
                  isLoading ||
                  isSubmitting
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
