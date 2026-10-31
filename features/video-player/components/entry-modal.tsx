import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/button';
import {
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetModal,
  BottomSheetModalProps,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetModal as BottomSheetModalType,
} from '@gorhom/bottom-sheet';
import { Token } from '@kuzulabz/expo-kagome';
import { Text, View, useWindowDimensions } from 'react-native';
import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { cssInterop } from 'nativewind';
import { useAppTheme } from '@/theme/theme-provider';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { insertIntoQueueQuery } from '@/db/features/queue/queue.queries';
import { CustomAddModal } from './custom-add-modal';
import { NOPQueryMapper, useQuery } from '@/db/hooks/use-query';
import {
  lookupExpressionQuery,
  lookupTokenQuery,
} from '@/db/features/dictionaries/dictionaries.queries';
import { useAppLiveQuery } from '@/db/hooks/use-app-live-query';
import { getAppDefaultsQuery } from '@/db/features/defaults/defaults.queries';
import { renderDefinition } from '../lib/render-entry-modal';
import { StoredDefinition } from '@/db/dictionaries/schema';
import { Ruby, RubyText } from '@/components/ui/ruby';
import { getDictionaryStyles } from '@/lib/dictionaries/cache';
import { resolveDictionaryAsset } from '@/lib/dictionaries/assets';

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
  const [internalLookup, setInternalLookup] = useState<{
    token: Token | null;
    expression: string;
    reading?: string;
  } | null>(null);
  const currentLookup = internalLookup?.token === token ? internalLookup : null;
  const { data: entries, isLoading } = useQuery(
    () =>
      currentLookup
        ? lookupExpressionQuery(currentLookup.expression, currentLookup.reading)
        : lookupTokenQuery(token!),
    NOPQueryMapper,
    [token, currentLookup],
    { enabled: token !== null }
  );

  const {
    data: defaults,
    isLoading: isDefaultsLoading,
    error: defaultsError,
  } = useAppLiveQuery(getAppDefaultsQuery(), (rows) => rows[0] ?? null);

  const snapPoints = useMemo(() => ['50%'], []);
  const { colors, theme } = useAppTheme();
  const viewport = useWindowDimensions();
  const [contentWidth, setContentWidth] = useState(viewport.width - 32);
  const insets = useSafeAreaInsets();

  const [isCustomAddOpen, setIsCustomAddOpen] = useState(false);
  const [isCustomAddSubmitting, setIsCustomAddSubmitting] = useState(false);

  const e: StoredDefinition[] | null =
    entries?.[0]?.definitionsJson != null
      ? (JSON.parse(entries[0].definitionsJson) as StoredDefinition[])
      : null;

  const renderedEntries = useMemo(
    () =>
      entries?.map((entry) => {
        const definitions = JSON.parse(entry.definitionsJson) as StoredDefinition[];
        const options = {
          stylesheet: getDictionaryStyles(entry.dictionary),
          environment: {
            width: viewport.width,
            height: viewport.height,
            contentWidth,
            fontSize: 16,
            fontScale: viewport.fontScale,
            color: colors.foreground,
            dark: theme === 'dark',
          },
          resolveAsset: (path: string) => resolveDictionaryAsset(entry.dictionary, path),
          onInternalLink: (href: string) => {
            const params = new URLSearchParams(href.slice(1));
            const expression = params.get('query');
            if (expression)
              setInternalLookup({ token, expression, reading: params.get('reading') ?? undefined });
          },
        };
        return (
          <View key={entry.id} style={{ width: contentWidth, paddingBottom: 16 }}>
            <Ruby>
              <Text className="text-4xl text-foreground">{entry.expression}</Text>
              <RubyText className="text-sm text-foreground">
                {entry.reading || entry.expression}
              </RubyText>
            </Ruby>
            <Text className="mb-2 text-xs text-mutedForeground">{entry.dictionary}</Text>
            {definitions.map((definition, index) =>
              definition.type === 'content' ? (
                <React.Fragment key={index}>{renderDefinition(definition, options)}</React.Fragment>
              ) : null
            )}
          </View>
        );
      }),
    [
      entries,
      viewport.width,
      viewport.height,
      viewport.fontScale,
      colors.foreground,
      theme,
      contentWidth,
      token,
    ]
  );

  const handleQuickAdd = useCallback(async () => {
    if (defaults?.modelApplicationId == null || e == null) {
      return;
    }

    try {
      await insertIntoQueueQuery({
        modelApplicationId: defaults.modelApplicationId,
        entry: e,
      });

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (err) {
      console.log('Quick add submit error');
      throw err;
    }
  }, [defaults?.modelApplicationId, e]);

  const renderFooter = useCallback(
    (footerProps: BottomSheetFooterProps) => (
      <BottomSheetFooter {...footerProps} bottomInset={0}>
        {e != null && (
          <View
            className="w-full gap-2 border-t border-border bg-surface px-4 pt-3"
            style={{ paddingBottom: insets.bottom + 5 }}>
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
                  disabled={
                    e == null ||
                    isDefaultsLoading ||
                    defaults?.modelApplicationId == null ||
                    defaultsError != null
                  }
                />
              </View>
            </View>

            {!isDefaultsLoading &&
              defaultsError == null &&
              defaults?.modelApplicationId == null && (
                <View className="bg-primaryMuted w-full flex-row items-center justify-center gap-2 rounded-full border-2 border-border px-4 py-2">
                  <Ionicons name="warning" size={18} className="text-primary" />

                  <Text className="flex-1 text-center text-[11px] font-semibold text-primary">
                    Configure a default model to enable the quick add button
                  </Text>
                </View>
              )}
          </View>
        )}
      </BottomSheetFooter>
    ),
    [
      defaults?.modelApplicationId,
      defaultsError,
      e,
      handleQuickAdd,
      insets.bottom,
      isDefaultsLoading,
    ]
  );

  const handleCustomAdd = async (modelApplicationId: number) => {
    if (e == null) {
      return;
    }

    setIsCustomAddSubmitting(true);

    try {
      await insertIntoQueueQuery({
        modelApplicationId,
        entry: e,
      });
    } catch (err) {
      console.log('Custom add submit error', err);
    } finally {
      setIsCustomAddSubmitting(false);
    }
  };

  return (
    <>
      <BottomSheetModal
        {...props}
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        backgroundStyle={{
          backgroundColor: colors.surface,
        }}
        footerComponent={renderFooter}>
        <BottomSheetScrollView
          onLayout={(event) => setContentWidth(Math.max(0, event.nativeEvent.layout.width - 32))}
          contentContainerClassName="px-4"
          contentContainerStyle={{
            paddingBottom: 88 + insets.bottom,
          }}>
          {currentLookup && (
            <Button
              label="Back to selected word"
              variant="secondary"
              onPress={() => setInternalLookup(null)}
            />
          )}
          {isLoading ? (
            <Text className="text-foreground" />
          ) : token && entries != null && entries.length > 0 && e != null ? (
            renderedEntries
          ) : (
            <Text className="text-foreground">
              {token ? 'No definitions found.' : 'No token selected.'}
            </Text>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>

      <CustomAddModal
        visible={isCustomAddOpen}
        initialModelApplicationId={defaults?.modelApplicationId}
        isSubmitting={isCustomAddSubmitting}
        onClose={() => setIsCustomAddOpen(false)}
        onSubmit={handleCustomAdd}
      />
    </>
  );
});

// <View className="gap-2">
//   <View className="w-full flex-row items-end gap-2">
//     <Text className="text-4xl text-foreground">{token.base_form}</Text>
//
//     <Text className="text-2xl text-mutedForeground">{e.reading}</Text>
//   </View>
//
//   <View className="flex-row items-start gap-2">
//     <Text className="font-semibold text-foreground">•</Text>
//
//     <Text className="flex-1 font-semibold text-foreground">
//       {e.definitionsJson.length}
//     </Text>
//   </View>
// </View>
