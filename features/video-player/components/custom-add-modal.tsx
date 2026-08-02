import Button from '@/components/ui/button';
import { allModelsQuery } from '@/db/features/models/models.queries';
import { NOPQueryMapper, useQuery } from '@/db/hooks/use-query';
import { useAppTheme } from '@/theme/theme-provider';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';

interface CustomAddModalProps {
  visible: boolean;
  close: () => void;
  initialModelApplicationId?: number | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (modelApplicationId: number) => void | Promise<void>;
}

export function CustomAddModal({
  visible,
  close,
  initialModelApplicationId,
  isSubmitting = false,
  onClose,
  onSubmit,
}: CustomAddModalProps) {
  const { colors } = useAppTheme();

  const { data: models, isLoading } = useQuery(allModelsQuery, NOPQueryMapper, []);

  const [selectedModelId, setSelectedModelId] = useState<number | null>(
    initialModelApplicationId ?? null
  );

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const selectedModel = useMemo(
    () => models?.find((model) => model.applicationId === selectedModelId) ?? null,
    [models, selectedModelId]
  );

  useEffect(() => {
    if (!visible || models == null) {
      return;
    }

    const initialModelExists =
      initialModelApplicationId != null &&
      models.some((model) => model.applicationId === initialModelApplicationId);

    if (initialModelExists) {
      setSelectedModelId(initialModelApplicationId);
      return;
    }

    setSelectedModelId(models[0]?.applicationId ?? null);
  }, [visible, initialModelApplicationId, models]);

  useEffect(() => {
    if (!visible) {
      setIsDropdownOpen(false);
    }
  }, [visible]);

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    setIsDropdownOpen(false);
    onClose();
  };

  const handleSelectModel = (modelApplicationId: number) => {
    setSelectedModelId(modelApplicationId);
    setIsDropdownOpen(false);
  };

  const handleSubmit = async () => {
    if (selectedModelId == null || isSubmitting) {
      return;
    }

    setIsDropdownOpen(false);
    await onSubmit(selectedModelId);
    close();
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
              <Text className="text-xl font-bold text-foreground">Add entry</Text>

              <Text className="mt-1 text-sm text-mutedForeground">
                Select the model you want to use.
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
            <Text className="mb-2 text-sm font-semibold text-foreground">Model</Text>

            {isLoading ? (
              <View className="items-center justify-center rounded-2xl border border-border bg-background py-8">
                <ActivityIndicator color={colors.foreground} />

                <Text className="mt-3 text-sm text-mutedForeground">Loading models…</Text>
              </View>
            ) : models == null || models.length === 0 ? (
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
                  showsVerticalScrollIndicator={models.length > 4}>
                  {models.map((model, index) => {
                    const isSelected = model.applicationId === selectedModelId;

                    return (
                      <Pressable
                        key={model.applicationId}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected: isSelected,
                        }}
                        className={`min-h-14 flex-row items-center px-4 py-3 ${
                          index !== models.length - 1 ? 'border-b border-border' : ''
                        }`}
                        onPress={() => {
                          handleSelectModel(model.applicationId);
                        }}>
                        <Text
                          numberOfLines={2}
                          className={`flex-1 text-base ${
                            isSelected ? 'font-semibold text-primary' : 'text-foreground'
                          }`}>
                          {model.modelFormData.name}
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
                  selectedModelId == null ||
                  models == null ||
                  models.length === 0 ||
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
