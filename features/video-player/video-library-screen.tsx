import React, { PropsWithChildren } from 'react';
import { ScrollView, View, Text, Pressable, Button, ViewProps } from 'react-native';
import { VideoLoaderToolbar } from './components/video-loader-toolbar';
import { useFileDb, VideoFileEntry } from '@/contexts/file-sqlite';
import { useDbFunc } from './hooks/use-dbfunc';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/theme-provider';
import { FlatList } from 'react-native-gesture-handler';

interface ScreenContentProps extends PropsWithChildren {
}

export const VideoLibraryScreen: React.FC<ScreenContentProps> = ({ children }) => {
  const { getVideos } = useFileDb();

  const {
    data: videos,
    isLoading,
    isError,
  } = useDbFunc(
    () => getVideos(),
    [getVideos]
  );

  return (
    <View className="flex-1 bg-background">
      <VideoLoaderToolbar />
      <View
        className="flex-1 p-4"
      >
        {isError ?
          <View>
            <Text className='text-foreground'>There was an error retrieving your videos</Text>
          </View>
          :
          <FlatList
            data={videos}
            renderItem={v => <VideoRow video={v.item} />}
            keyExtractor={v => String(v.id)}
            ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          />
        }
      </View>
    </View >
  );
};

interface VideoRowProps extends ViewProps {
  video: VideoFileEntry;
}

const VideoRow = ({ video }: VideoRowProps) => {
  const { colors } = useAppTheme();

  return (
    <View className="bg-surface rounded-2xl p-2.5">
      <Pressable
        className="gap-2 items-start"
        onPress={() => {
          router.push({
            pathname: "/video-player",
            params: {
              videoId: video.id,
              subtitlesId: video.subtitle_id,
            },
          });
        }}
      >
        <Text
          className="text-foreground w-full"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {video.name}
        </Text>

        <View className="flex-row items-center gap-1 rounded-full border border-primary px-1.5 py-0.5">
          <Ionicons
            name="document"
            size={20}
            className="text-primary"
            color={colors.primary}
          />

          <Text className="text-primary text-[9px] uppercase ">
            {video.subtitle_id ? "Captions" : "No Captions"}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

// function SubtitleBadge() {
//   if (subtitle.status === "attached") {
//     return (
//       <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">
//         <Captions className="h-2.5 w-2.5" />
//         {subtitle.lang} · {subtitle.format}
//       </span>
//     );
//   }
//   if (subtitle.status === "auto") {
//     return (
//       <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-300">
//         <Captions className="h-2.5 w-2.5" />
//         Auto · {subtitle.confidence}%
//       </span>
//     );
//   }
//   return (
//     <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
//       <CaptionsOff className="h-2.5 w-2.5" />
//       No subs
//     </span>
//   );
// }
//
