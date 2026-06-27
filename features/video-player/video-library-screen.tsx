import React, { PropsWithChildren } from 'react';
import { View, Text, Pressable, ViewProps } from 'react-native';
import { VideoLoaderToolbar } from './components/video-loader-toolbar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/theme-provider';
import { FlatList } from 'react-native-gesture-handler';
import { useVideos } from '@/lib/file-db-hooks';

interface ScreenContentProps extends PropsWithChildren {
}

export const VideoLibraryScreen: React.FC<ScreenContentProps> = ({ children }) => {
  const { data, error } = useVideos();

  const isError = error != undefined;

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
            data={data}
            contentContainerStyle={{
              paddingBottom: 74, // TODO: find a way to get access to AppTabs height
              gap: 12,
            }}
            renderItem={v => <VideoRow
              videoId={v.item.id}
              videoSubtitleId={v.item.subtitle_id}
              videoName={v.item.name}
            />}
            keyExtractor={v => String(v.id)}
          />
        }
      </View>
    </View >
  );
};

interface VideoRowProps extends ViewProps {
  videoId: number;
  videoSubtitleId: number | null;
  videoName: string;
}

const VideoRow = ({ videoId, videoSubtitleId, videoName }: VideoRowProps) => {
  const { colors } = useAppTheme();

  return (
    <View className="bg-surface rounded-2xl p-2.5">
      <Pressable
        className="gap-2 items-start pb-3"
        onPress={() => {
          router.push({
            pathname: "/video-player",
            params: {
              videoId: videoId,
              subtitlesId: videoSubtitleId,
            },
          });
        }}
      >
        <Text
          className="text-foreground w-full"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {videoName}
        </Text>

        <View className="flex-row items-center gap-1 rounded-full border border-primary px-1.5 py-0.5">
          <Ionicons
            name="document"
            size={20}
            className="text-primary"
            color={colors.primary}
          />

          <Text className="text-primary text-[9px] uppercase ">
            {videoSubtitleId ? "Captions" : "No Captions"}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
