import React from 'react';
import VideoPlayer from './components/video-player';
import SubtitlesPlayer from './components/subtitles-player';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EntryModalProvider } from './contexts/entry-modal-context';
import { VideoScreenProvider } from './contexts/video-screen-context';
import { MediaSource } from './lib/player-sources';

export const VideoPlayerScreen: React.FC = () => {
  const { sourceString } = useLocalSearchParams<{ sourceString: string }>();
  const source = JSON.parse(sourceString) as MediaSource;

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

      <VideoScreenProvider source={source}>
        <EntryModalProvider>
          <SafeAreaView edges={['top', 'right', 'left']} className="flex-1 bg-background">
            <VideoPlayer />
            <SubtitlesPlayer />
          </SafeAreaView>
        </EntryModalProvider>
      </VideoScreenProvider>
    </>
  );
};
