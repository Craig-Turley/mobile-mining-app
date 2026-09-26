import React from 'react';
import VideoPlayer from './components/video-player';
import SubtitlesPlayer from './components/subtitles-player';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EntryModalProvider } from './contexts/entry-modal-context';
import { VideoScreenProvider } from './contexts/video-screen-context';
import { MediaSource } from './lib/player-sources';
import VideoPlayerControlCenter from './components/video-control-center';
import { SubtitlePlayerProvider } from './contexts/subtitles-context';

export const VideoPlayerScreen: React.FC = () => {
  const { sourceString } = useLocalSearchParams<{ sourceString: string }>();
  const source = JSON.parse(sourceString) as MediaSource;

  return (
    <>
      <Stack.Screen
        options={{ headerShown: false }}
      />

      <VideoScreenProvider source={source}>
        <SubtitlePlayerProvider>
          <EntryModalProvider>
            <SafeAreaView edges={['top', 'right', 'left']} className="flex-1 bg-background">
              <VideoPlayer />
              <SubtitlesPlayer />
              <VideoPlayerControlCenter />
            </SafeAreaView>
          </EntryModalProvider>
        </SubtitlePlayerProvider>
      </VideoScreenProvider >
    </>
  );
};
