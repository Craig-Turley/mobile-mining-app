import React, { PropsWithChildren, useEffect } from 'react';
import VideoPlayer from './components/video-player';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubtitlesPlayer from './components/subtitles-player';
import { useVideoPlayer } from 'expo-video';
import { EntryModalProvider } from './contexts/entry-modal-context';

interface ScreenContentProps extends PropsWithChildren {
}

export const VideoPlayerScreen: React.FC<ScreenContentProps> = ({ children }) => {
  const { videoId, subtitlesId } = useLocalSearchParams<{ videoId: string, subtitlesId: string }>();

  const player = useVideoPlayer(null, player => {
    player.timeUpdateEventInterval = 0.25;
    player.play();
  });

  return (
    <>
      <Stack.Screen
        options={{
          headerTransparent: true,
          title: "",
        }}
      />

      <EntryModalProvider>
        <SafeAreaView edges={['top', 'right', 'left']} className="flex-1 bg-background">
          <VideoPlayer player={player} videoId={Number(videoId)} />
          <SubtitlesPlayer player={player} videoId={Number(videoId)} subtitlesId={Number(subtitlesId)} />
        </SafeAreaView>
      </EntryModalProvider>
    </>
  );

};
