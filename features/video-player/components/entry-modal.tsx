import * as Haptics from 'expo-haptics';
import Button from '@/components/ui/button';
import {
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetModal,
  BottomSheetModalProps,
  BottomSheetView,
  type BottomSheetModal as BottomSheetModalType,
} from '@gorhom/bottom-sheet';
import { Token } from '@kuzulabz/expo-kagome';
import { Text, View } from 'react-native';
import { forwardRef, useCallback, useMemo, useState } from 'react';
import { cssInterop } from 'nativewind';
import { useAppTheme } from '@/theme/theme-provider';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { insertIntoQueueQuery } from '@/db/features/queue/queue.queries';
import { CustomAddModal } from './custom-add-modal';
import { useQuery } from '@/db/hooks/use-query';
import { lookupTokenQuery } from '@/db/features/dictionaries/dictionaries.queries';
import { mapStoredEntryToEntry } from '@/lib/entry/entry.mapper';
import { useAppLiveQuery } from '@/db/hooks/use-app-live-query';
import { getAppDefaultsQuery } from '@/db/features/defaults/defaults.queries';

interface EntryModalProps extends BottomSheetModalProps {
  token: Token | null;
}

cssInterop(BottomSheetView, {
  className: 'style',
});

cssInterop(BottomSheetModal, {
  backgroundClassName: 'backgroundStyle',
  handleIndicatorClassName: 'handleIndicatorStyle',
});

export const EntryBottomSheetModal = forwardRef<
  BottomSheetModalType,
  Omit<EntryModalProps, 'children'>
>(({ token, ...props }, ref) => {
  const { data: entries, isLoading } = useQuery(
    () => lookupTokenQuery(token!),
    mapStoredEntryToEntry,
    [token]
  );

  const {
    data: defaults,
    isLoading: isDefaultsLoading,
    error: defaultsError,
  } = useAppLiveQuery(
    getAppDefaultsQuery(),
    (rows) => rows[0] ?? null
  );

  const snapPoints = useMemo(() => ['35%'], []);
  const { colors } = useAppTheme();

  const [isCustomAddOpen, setIsCustomAddOpen] = useState(false);
  const [isCustomAddSubmitting, setIsCustomAddSubmitting] = useState(false);

  const e = entries != null && entries?.length > 0 ? entries[0] : null;

  const insets = useSafeAreaInsets();

  const handleQuickAdd = async () => {
    if (defaults?.modelApplicationId == null || e == null) return;

    try {
      insertIntoQueueQuery({ modelApplicationId: defaults.modelApplicationId, entry: e });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (err) {
      console.log('Quick add submit error');
      throw err;
    }
  };

  const renderFooter = useCallback(
    (footerProps: BottomSheetFooterProps) => (
      <BottomSheetFooter {...footerProps} bottomInset={insets.bottom}>
        <View
          className="w-full gap-2 border-t border-border bg-surface px-4 pt-3"
          style={{ paddingBottom: 5 }}
        >
          <View className="w-full flex-row gap-2">
            <View className="flex-1">
              <Button
                label="Add"
                className="rounded-full"
                variant="secondary"
                onPress={() => setIsCustomAddOpen(true)}
              />
            </View>

            <View className="flex-1">
              <Button
                label="Quick Add"
                className="rounded-full"
                onPress={handleQuickAdd}
                successLabel="Added"
                successIcon="checkmark"
                disabled={e == null || isDefaultsLoading || defaults?.modelApplicationId == null || defaultsError != null}
              />
            </View>
          </View>

          {!isDefaultsLoading &&
            defaultsError == null &&
            defaults?.modelApplicationId == null && (
              <View className="bg-primaryMuted w-full flex-row items-center justify-center gap-2 rounded-full border-2 border-border px-4 py-2">
                <Ionicons
                  name="warning"
                  size={18}
                  className="text-primary"
                />

                <Text className="flex-1 text-center text-[11px] font-semibold text-primary">
                  Configure a default model to enable the quick add button
                </Text>
              </View>
            )}
        </View>
      </BottomSheetFooter>
    ),
    [defaults?.modelApplicationId, defaultsError, e, handleQuickAdd, insets.bottom, isDefaultsLoading]
  );

  const handleCustomAdd = (modelApplicationId: number) => {
    setIsCustomAddSubmitting(true);
    try {
      insertIntoQueueQuery({
        modelApplicationId: modelApplicationId,
        entry: e!,
      });
    } catch {
      console.log("Custom add submit error");
    } finally {
      setIsCustomAddSubmitting(false);
    }
  };

  return (
    <>
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        backgroundStyle={{
          backgroundColor: colors.surface,
        }}
        footerComponent={e != null ? renderFooter : undefined}
        {...props}>
        <BottomSheetView
          className="flex-1 px-4"
          style={{
            paddingBottom: 88 + insets.bottom,
          }}>
          {isLoading ? (
            <Text className="text-foreground" />
          ) : token && entries != null && e != null ? (
            <View className="gap-2">
              <View className="w-full flex-row items-end gap-2">
                <Text className="text-4xl text-foreground">{token.base_form}</Text>

                <Text className="text-2xl text-mutedForeground">{e.kana[0].text}</Text>
              </View>

              <View className="flex-row items-start gap-2">
                <Text className="font-semibold text-foreground">•</Text>

                <Text className="flex-1 font-semibold text-foreground">
                  {e.sense[0].gloss.map((gloss) => gloss.text).join(', ')}
                </Text>
              </View>
            </View>
          ) : (
            <Text className="text-foreground">No token selected.</Text>
          )}
        </BottomSheetView>
      </BottomSheetModal>

      <CustomAddModal
        visible={isCustomAddOpen}
        close={() => setIsCustomAddOpen(false)}
        initialModelApplicationId={defaults?.modelApplicationId}
        isSubmitting={isCustomAddSubmitting}
        onClose={() => {
          if (!isCustomAddSubmitting) {
            setIsCustomAddOpen(false);
          }
        }}
        onSubmit={handleCustomAdd}
      />
    </>
  );
});
