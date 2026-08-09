import React from 'react';
import { View, Text, FlatList, Pressable, Alert } from 'react-native';
import { cssInterop, remapProps } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { DictionariesToolbar } from './components/dictionaries-toolbar';
import { useAppTheme } from '@/theme/theme-provider';
import { DictionaryImportOverlay } from './components/dictionary-import-overlay';
import { useDictionaryDownload } from './hooks/use-dict-download';
import { useHasDictionary } from '@/db/features/dictionaries/dictionaries.hooks';

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

export const DictionariesScreen = () => {
  return (
    <View className="flex-1 bg-background px-3">
      <DictionariesToolbar />
      <View className="rounded-[10px] bg-surface">

        <JMDictRow />

      </View>
    </View>
  );
};

// NOTE: this is temporary. when other dictionaries are support this will turn into a dictionary row
const JMDictRow: React.FC = () => {
  const app = useAppTheme();

  const {
    data: hasDictionary,
    isLoading: isHasDictionaryLoading,
    isError: isHasDictionaryError,
    refresh: refreshHasDictionary,
  } = useHasDictionary();

  const {
    mutate: downloadDict,
    isPending: isDownloadPending,
    isError: isDownloadError,
    importing,
  } = useDictionaryDownload(
    process.env.EXPO_PUBLIC_DICTIONARY_SERVER_URL || "",
    refreshHasDictionary,
  );

  const content = (() => {
    if (isHasDictionaryLoading) {
      return (
        <View className="min-h-[50px] flex-row items-center px-4">
          <Text className="flex-1 text-[17px] leading-[22px] text-foreground">
            JMDict
          </Text>
          <View>
            <Text className="text-foreground">...</Text>
          </View>
        </View>
      );
    }
    if (isDownloadPending) {
      return (
        <View className="min-h-[50px] flex-row items-center px-4">
          <Text className="flex-1 text-[17px] leading-[22px] text-foreground">
            JMDict
          </Text>
          <View>
            <Text className="text-foreground">Downloading...</Text>
          </View>
        </View>
      );
    }
    if (isDownloadError) {
      Alert.alert(
        "Error downloading dictionary",
        "There was an error downloading your dictionary. Please check your network settings and try again. If the error persits, please reach out to support"
      );
      return (
        <View className="min-h-[50px] flex-row items-center px-4">
          <Text className="flex-1 text-[17px] leading-[22px] text-foreground">
            JMDict
          </Text>
          <View className="flex-row items-center gap-3">
            <Pressable onPress={downloadDict}>
              <View className="flex-row items-center gap-2">
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color={app.colors.primary}
                />
                <Text className="text-[15px] text-primary">Retry</Text>
              </View>
            </Pressable>
          </View>
        </View>
      );
    }
    if (isHasDictionaryError) {
      return (
        <View className="min-h-[50px] flex-row items-center px-4">
          <Text className="flex-1 text-[17px] leading-[22px] text-foreground">
            JMDict
          </Text>
          <View>
            <Text className="text-primary">Error getting download information</Text>
          </View>
        </View>
      );
    }
    return (
      <View className="min-h-[50px] flex-row items-center px-4">
        <Text className="flex-1 text-[17px] leading-[22px] text-foreground">
          JMDict
        </Text>
        <Pressable disabled={hasDictionary} onPress={downloadDict}>
          <Ionicons
            name={hasDictionary ? "checkmark" : "download-outline"}
            color={hasDictionary ? app.colors.posNoun : app.colors.primary}
            size={24}
          />
        </Pressable>
      </View>
    );
  })();

  return (
    <>
      {content}
      <DictionaryImportOverlay visible={importing} label="Importing dictionary…" />
    </>
  );
};
