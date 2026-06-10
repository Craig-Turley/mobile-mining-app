import React, { PropsWithChildren } from 'react';
import { ScrollView, View, Text, Pressable, Button } from 'react-native';
import { VideoLoaderToolbar } from './components/video-loader-toolbar';
import { useFileDb } from '@/contexts/file-sqlite';
import { useDbFunc } from './hooks/use-dbfunc';

interface ScreenContentProps extends PropsWithChildren {
}

export const VideoLibraryScreen: React.FC<ScreenContentProps> = ({ children }) => {
  const { getVideos } = useFileDb();

  const {
    data: videos,
    isLoading,
    error,
    isError,
  } = useDbFunc(
    () => getVideos(),
    [getVideos]
  );

  return (
    <View className="flex-1 bg-background">
      <VideoLoaderToolbar />

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4"
      >
        {isError ?
          <View>
            <Text>There was an error retrieving your videos</Text>
          </View>
          :
          videos?.map((video, index) => (
            <View key={index}>
              <Text className="text-foreground">{video.name}</Text>
            </View>
          ))
        }
      </ScrollView>
    </View >
  );
};
