import React, { PropsWithChildren, useEffect } from 'react';
import VideoPlayer from './components/video-player';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubtitlesPlayer from './components/subtitles-player';
import { useVideoPlayer } from 'expo-video';
import { EntryModalProvider } from './contexts/entry-modal-context';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { filesDb } from '@/db/files/client';
import { videos } from '@/db/files/schema';
import { eq } from "drizzle-orm";
import { ActivityIndicator } from 'react-native';

interface ScreenContentProps extends PropsWithChildren {
}

export const VideoPlayerScreen: React.FC<ScreenContentProps> = ({ children }) => {
  const { videoId } = useLocalSearchParams<{ videoId: string }>();

  const { data, error } = useLiveQuery(filesDb
    .select({
      id: videos.id,
      name: videos.name,
      relative_path: videos.relativePath,
      subtitle_id: videos.subtitleId,
    })
    .from(videos)
    .where(eq(videos.id, Number(videoId)))
    .limit(1));

  const player = useVideoPlayer(null, player => {
    player.timeUpdateEventInterval = 0.25;
    player.play();
  });

  const isLoading = data.length === 0;
  const video = data?.[0] ?? null;
  const notFound = !isLoading && !error && data.length === 0;

  console.log("Subtitle id", video?.subtitle_id);

  if (notFound) {
    console.log("NOT FOUND");
  }

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
          {isLoading ?
            <ActivityIndicator size="large" color="#999999" />
            :
            <>
              <VideoPlayer player={player} videoId={Number(videoId)} />
              <SubtitlesPlayer player={player} videoId={Number(videoId)} subtitlesId={Number(video.subtitle_id)} />
            </>
          }
        </SafeAreaView>
      </EntryModalProvider>
    </>
  );

};
