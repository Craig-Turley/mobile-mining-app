import { VideoPlayer as ExpoVideoPlayer, VideoView } from 'expo-video';
import { cssInterop } from 'nativewind';
import { View, Text } from 'react-native';
import { PropsWithChildren, useEffect } from 'react';
import { useFileDb } from '@/contexts/file-sqlite';
import { useDbFunc } from '../hooks/use-dbfunc';
import { buildFullPath } from '@/lib/file-system';

cssInterop(VideoView, {
  className: "style",
});

export interface VideoPlayerProps extends PropsWithChildren {
  videoId: number,
  player: ExpoVideoPlayer,
}

export default function VideoPlayer({ videoId, player }: VideoPlayerProps) {
  const { getVideoData } = useFileDb();
  const { data, isLoading, isError } = useDbFunc(
    () => getVideoData(Number(videoId)),
    [getVideoData],
  );

  useEffect(() => {
    if (!isLoading && data != null) {
      const path = buildFullPath(data.relative_path)
      player.replace(path);
    }
  }, [isLoading]);

  if (isError) {
    return (
      <View>
        <Text className="text-foreground">Error loading the video</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View>
        <Text className="text-foreground">Loading...</Text>
      </View>
    );
  }


  return (
    <View>
      <VideoView
        className="w-full aspect-video"
        player={player}
        fullscreenOptions={{ enable: true }}
        allowsPictureInPicture
      />
    </View>
  );
}
