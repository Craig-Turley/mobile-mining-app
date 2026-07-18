import React, { PropsWithChildren } from 'react';
import VideoPlayer from './components/video-player';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubtitlesPlayer from './components/subtitles-player';
import { useVideoPlayer } from 'expo-video';
import { EntryModalProvider } from './contexts/entry-modal-context';
import { ActivityIndicator, Text } from 'react-native';
import { useVideoData } from '@/lib/file-db-hooks';
import { VideoScreenProvider } from './contexts/video-screen-context';

interface ScreenContentProps extends PropsWithChildren {}

export const VideoPlayerScreen: React.FC<ScreenContentProps> = ({ children }) => {
  const { videoId } = useLocalSearchParams<{ videoId: string }>();

  const numericVideoId = Number(videoId);

  const { data, error, isLoading } = useVideoData(numericVideoId);

  const player = useVideoPlayer(null, (player) => {
    player.timeUpdateEventInterval = 0.25;
    player.play();
  });

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
                <VideoPlayer player={player} videoId={numericVideoId} />

                <SubtitlesPlayer
                  key={`${video.id}-${video.subtitle_id ?? 'none'}`}
                  player={player}
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
