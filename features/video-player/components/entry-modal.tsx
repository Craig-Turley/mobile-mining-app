import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/button';
import {
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetHandle,
  type BottomSheetHandleProps,
  BottomSheetModal,
  BottomSheetModalProps,
  BottomSheetScrollView,
  BottomSheetView,
  TouchableOpacity,
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
import { mapStoredTermToEntry, type Entry } from '@/lib/entry';

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
  const { data: lookupResult, isLoading } = useQuery(
    async () => ({
      token,
      lookup: currentLookup,
      entries: await (currentLookup
        ? lookupExpressionQuery([currentLookup.expression])
        : lookupTokenQuery(token!)),
    }),
    NOPQueryMapper,
    [token, currentLookup],
    { enabled: token !== null }
  );
  const entries =
    lookupResult?.token === token && lookupResult?.lookup === currentLookup
      ? lookupResult.entries
      : null;
  const [selection, setSelection] = useState<{ entries: typeof entries; index: number } | null>(
    null
  );
  const activeIndex =
    selection?.entries === entries
      ? Math.min(selection.index, Math.max(0, (entries?.length ?? 0) - 1))
      : 0;
  const activeEntry = !isLoading ? (entries?.[activeIndex] ?? null) : null;
  const changeEntry = useCallback(
    (direction: number) => {
      if (!entries?.length) return;
      setSelection((previous) => ({
        entries,
        index: Math.max(
          0,
          Math.min(
            entries.length - 1,
            (previous?.entries === entries ? previous.index : 0) + direction
          )
        ),
      }));
    },
    [entries]
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

  const [customAddEntry, setCustomAddEntry] = useState<Entry | null>(null);
  const [isCustomAddSubmitting, setIsCustomAddSubmitting] = useState(false);

  const activeDefinitions = useMemo(
    () => (activeEntry ? (JSON.parse(activeEntry.definitionsJson) as StoredDefinition[]) : null),
    [activeEntry]
  );

  const renderedEntry = useMemo(() => {
    const entry = activeEntry;
    if (!entry || !activeDefinitions) return null;
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
        {activeDefinitions.map((definition, index) =>
          definition.type === 'content' ? (
            <React.Fragment key={index}>{renderDefinition(definition, options)}</React.Fragment>
          ) : null
        )}
      </View>
    );
  }, [
    activeEntry,
    activeDefinitions,
    viewport.width,
    viewport.height,
    viewport.fontScale,
    colors.foreground,
    theme,
    contentWidth,
    token,
  ]);

  const handleQuickAdd = useCallback(async () => {
    if (defaults?.modelApplicationId == null || activeEntry == null) {
      return;
    }

    try {
      await insertIntoQueueQuery({
        modelApplicationId: defaults.modelApplicationId,
        entry: mapStoredTermToEntry(activeEntry),
      });

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (err) {
      console.log('Quick add submit error');
      throw err;
    }
  }, [defaults?.modelApplicationId, activeEntry]);

  const renderHandle = useCallback(
    (handleProps: BottomSheetHandleProps) => (
      <View>
        <BottomSheetHandle {...handleProps} />
        {activeEntry != null && entries != null && entries.length > 1 && (
          <View className="flex-row items-center justify-between px-4 pb-2">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Previous entry"
              accessibilityState={{ disabled: activeIndex === 0 }}
              disabled={activeIndex === 0}
              activeOpacity={0.6}
              hitSlop={8}
              style={{
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: activeIndex === 0 ? 0.35 : 1,
              }}
              onPress={() => changeEntry(-1)}>
              <Ionicons name="chevron-back" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text accessibilityLiveRegion="polite" className="text-sm text-foreground">
              {activeIndex + 1} / {entries.length}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Next entry"
              accessibilityState={{ disabled: activeIndex === entries.length - 1 }}
              disabled={activeIndex === entries.length - 1}
              activeOpacity={0.6}
              hitSlop={8}
              style={{
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: activeIndex === entries.length - 1 ? 0.35 : 1,
              }}
              onPress={() => changeEntry(1)}>
              <Ionicons name="chevron-forward" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    ),
    [activeEntry, entries, activeIndex, changeEntry, colors.foreground]
  );

  const renderFooter = useCallback(
    (footerProps: BottomSheetFooterProps) => (
      <BottomSheetFooter {...footerProps} bottomInset={0}>
        {activeDefinitions != null && (
          <View
            className="w-full gap-2 border-t border-border bg-surface px-4 pt-3"
            style={{ paddingBottom: insets.bottom + 5 }}>
            <View className="w-full flex-row gap-2">
              <View className="flex-1">
                <Button
                  label="Add"
                  className="rounded-full"
                  variant="secondary"
                  onPress={() => {
                    if (activeEntry) setCustomAddEntry(mapStoredTermToEntry(activeEntry));
                  }}
                />
              </View>

              <View className="flex-1">
                <Button
                  key={activeEntry?.id}
                  label="Quick Add"
                  className="rounded-full"
                  onPress={handleQuickAdd}
                  successLabel="Added"
                  successIcon="checkmark"
                  disabled={
                    activeDefinitions == null ||
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
      activeDefinitions,
      activeEntry,
      handleQuickAdd,
      insets.bottom,
      isDefaultsLoading,
    ]
  );

  const handleCustomAdd = async (modelApplicationId: number) => {
    if (customAddEntry == null) {
      return;
    }

    setIsCustomAddSubmitting(true);

    try {
      await insertIntoQueueQuery({
        modelApplicationId,
        entry: customAddEntry,
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
        handleComponent={renderHandle}
        footerComponent={renderFooter}>
        <BottomSheetScrollView
          key={activeEntry?.id ?? 'empty'}
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
          ) : token && activeEntry != null ? (
            renderedEntry
          ) : (
            <Text className="text-foreground">
              {token ? 'No definitions found.' : 'No token selected.'}
            </Text>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>

      <CustomAddModal
        visible={customAddEntry != null}
        initialModelApplicationId={defaults?.modelApplicationId}
        isSubmitting={isCustomAddSubmitting}
        onClose={() => setCustomAddEntry(null)}
        onSubmit={handleCustomAdd}
      />
    </>
  );
});
