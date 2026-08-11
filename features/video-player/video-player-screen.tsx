import React from 'react';
import VideoPlayer from './components/video-player';
import SubtitlesPlayer from './components/subtitles-player';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EntryModalProvider } from './contexts/entry-modal-context';
import { ActivityIndicator, Text } from 'react-native';
import { VideoScreenProvider } from './contexts/video-screen-context';
import { useAppLiveQuery } from '@/db/hooks/use-app-live-query';
import { videoByIdQuery } from '@/db/features/files/files.queries';
import { NOPQueryMapper } from '@/db/hooks/use-query';

export const VideoPlayerScreen: React.FC = () => {
  const { videoId } = useLocalSearchParams<{ videoId: string }>();

  const numericVideoId = Number(videoId);

  const { data, error, isLoading } = useAppLiveQuery(
    videoByIdQuery(numericVideoId),
    NOPQueryMapper
  );

  const isError = error !== undefined;
  const video = data?.[0] ?? null;
  const notFound = !isLoading && !isError && video === null;

  return (
    <>
      <Stack.Screen
        options={{
          headerTransparent: true,
          headerBackButtonDisplayMode: 'minimal',
          title: '',
          gestureEnabled: false,
        }}
      />

      <VideoScreenProvider>
        <EntryModalProvider>
          <SafeAreaView edges={['top', 'right', 'left']} className="flex-1 bg-background">
            {isLoading ? (
              <ActivityIndicator size="large" color="#999999" />
            ) : isError ? (
              <Text className="text-foreground">Error loading video.</Text>
            ) : notFound ? (
              <Text className="text-foreground">Video not found.</Text>
            ) : (
              <>
                <VideoPlayer videoId={numericVideoId} />

                <SubtitlesPlayer
                  key={`${video.id}-${video.subtitle_id ?? 'none'}`}
                  videoId={numericVideoId}
                  subtitlesId={video.subtitle_id}
                />
              </>
            )}
          </SafeAreaView>
        </EntryModalProvider>
      </VideoScreenProvider>
    </>
  );
};
