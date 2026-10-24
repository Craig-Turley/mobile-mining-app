import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { cssInterop, remapProps } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { DictionariesToolbar } from './components/dictionaries-toolbar';
import { AnchoredMenu, AnchoredMenuItem, AnchoredMenuTrigger } from '@/components/ui/anchored-menu';
import { NOPMutationMapper, useAppLiveQuery } from '@/db/hooks/use-app-live-query';
import { deleteDictionaryByIdQuery, getDictionariesQuery } from '@/db/features/dictionaries/dictionaries.queries';
import { NOPQueryMapper } from '@/db/hooks/use-query';
import { StoredDictionary } from '@/db/dictionaries/schema';
import { useMutation } from '@/db/hooks/use-mutation';
import { cn } from '@/utils/cn';

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
  const {
    data: dictionaries,
    isLoading: isDictionariesLoading,
  } = useAppLiveQuery(
    getDictionariesQuery(),
    NOPQueryMapper,
  );

  return (
    <View className="flex-1 bg-background">
      <DictionariesToolbar />

      {isDictionariesLoading ? (
        <Text className="text-foreground">Loading...</Text>
      ) : (
        <FlatList
          data={dictionaries ?? []}
          contentInsetAdjustmentBehavior="automatic"
          className="flex-1"
          contentContainerClassName="p-3"
          renderItem={({ item }) => (
            <DictionaryRow dictionary={item} />
          )}
          keyExtractor={(item) => String(item.id)}
        />
      )}
    </View>
  );
};

const DictionaryRow: React.FC<{ dictionary: StoredDictionary }> = ({ dictionary }) => {
  const { mutate, isPending } = useMutation(deleteDictionaryByIdQuery, NOPMutationMapper);

  return (
    <View
      className={cn(
        'w-full flex-row items-start gap-3 rounded-2xl',
        'border border-border bg-surface p-4'
      )}>
      <Text className="flex-1 text-foreground">{dictionary.title}</Text>
      <AnchoredSettings id={dictionary.id} deleteById={mutate} disabled={isPending} />
    </View>
  );
};

const AnchoredSettings: React.FC<{ id: number, deleteById: (id: number) => void, disabled: boolean }> = ({ id, disabled, deleteById }) => {
  return (
    <AnchoredMenu>
      <AnchoredMenuTrigger>
        <Ionicons name="ellipsis-vertical" size={18} className="text-mutedForeground" />
      </AnchoredMenuTrigger>

      <AnchoredMenuItem
        icon="trash-outline"
        label="Delete"
        disabled={disabled}
        destructive
        onPress={async () => {
          deleteById(id);
        }}
      />
    </AnchoredMenu>
  );
};


// // NOTE: this is temporary. when other dictionaries are support this will turn into a dictionary row
// const JMDictRow: React.FC = () => {
//   const app = useAppTheme();
//
//   const {
//     data: hasDictionary,
//     isLoading: isHasDictionaryLoading,
//     isError: isHasDictionaryError,
//     refresh: refreshHasDictionary,
//   } = useHasDictionary();
//
//   const {
//     mutate: downloadDict,
//     isPending: isDownloadPending,
//     isError: isDownloadError,
//     importing,
//   } = useDictionaryDownload(
//     process.env.EXPO_PUBLIC_DICTIONARY_SERVER_URL || '',
//     refreshHasDictionary
//   );
//
//   const content = (() => {
//     if (isHasDictionaryLoading) {
//       return (
//         <View className="min-h-[50px] flex-row items-center px-4">
//           <Text className="flex-1 text-[17px] leading-[22px] text-foreground">JMDict</Text>
//           <View>
//             <Text className="text-foreground">...</Text>
//           </View>
//         </View>
//       );
//     }
//     if (isDownloadPending) {
//       return (
//         <View className="min-h-[50px] flex-row items-center px-4">
//           <Text className="flex-1 text-[17px] leading-[22px] text-foreground">JMDict</Text>
//           <View>
//             <Text className="text-foreground">Downloading...</Text>
//           </View>
//         </View>
//       );
//     }
//     if (isDownloadError) {
//       Alert.alert(
//         'Error downloading dictionary',
//         'There was an error downloading your dictionary. Please check your network settings and try again. If the error persits, please reach out to support'
//       );
//       return (
//         <View className="min-h-[50px] flex-row items-center px-4">
//           <Text className="flex-1 text-[17px] leading-[22px] text-foreground">JMDict</Text>
//           <View className="flex-row items-center gap-3">
//             <Pressable onPress={downloadDict}>
//               <View className="flex-row items-center gap-2">
//                 <Ionicons name="alert-circle-outline" size={20} color={app.colors.primary} />
//                 <Text className="text-[15px] text-primary">Retry</Text>
//               </View>
//             </Pressable>
//           </View>
//         </View>
//       );
//     }
//     if (isHasDictionaryError) {
//       return (
//         <View className="min-h-[50px] flex-row items-center px-4">
//           <Text className="flex-1 text-[17px] leading-[22px] text-foreground">JMDict</Text>
//           <View>
//             <Text className="text-primary">Error getting download information</Text>
//           </View>
//         </View>
//       );
//     }
//     return (
//       <View className="min-h-[50px] flex-row items-center px-4">
//         <Text className="flex-1 text-[17px] leading-[22px] text-foreground">JMDict</Text>
//
//         <Pressable
//           disabled={hasDictionary}
//           onPress={downloadDict}
//           className="flex-row items-center gap-2">
//           <Ionicons
//             name={hasDictionary ? 'checkmark' : 'download-outline'}
//             color={hasDictionary ? app.colors.posNoun : app.colors.primary}
//             size={24}
//           />
//           {hasDictionary && <AnchoredJMDictSettings refresh={refreshHasDictionary} />}
//         </Pressable>
//       </View>
//     );
//   })();
//
//   return (
//     <>
//       {content}
//       <DictionaryImportOverlay visible={importing} label="Importing dictionary…" />
//     </>
//   );
// };
//
// // NOTE: this is just tempoaray until how to drive this page
// const AnchoredJMDictSettings: React.FC<{ refresh: () => void }> = ({ refresh }) => {
//   return (
//     <AnchoredMenu>
//       <AnchoredMenuTrigger>
//         <Ionicons name="ellipsis-vertical" size={18} className="text-mutedForeground" />
//       </AnchoredMenuTrigger>
//
//       <AnchoredMenuItem
//         icon="trash-outline"
//         label="Delete"
//         destructive
//         onPress={async () => {
//           const file = new File(DefaultSQLiteDownloadDirectory, 'jmdict-v1.0.0.db');
//           await deleteDict(file.uri);
//           refresh();
//         }}
//       />
//     </AnchoredMenu>
//   );
// };
