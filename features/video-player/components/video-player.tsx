import { VideoPlayer as ExpoVideoPlayer, VideoView } from 'expo-video';
import { cssInterop } from 'nativewind';
import { View, Text } from 'react-native';
import { PropsWithChildren, useEffect } from 'react';
import { buildFullPath } from '@/lib/file-system';
import { useAppLiveQuery } from '@/db/hooks/use-app-live-query';
import { videoByIdQuery } from '@/db/features/files/files.queries';
import { NOPQueryMapper } from '@/db/hooks/use-query';

cssInterop(VideoView, {
  className: 'style',
});

export interface VideoPlayerProps extends PropsWithChildren {
  videoId: number;
  player: ExpoVideoPlayer;
}

export default function VideoPlayer({ videoId, player }: VideoPlayerProps) {
  const { data, error, isLoading } = useAppLiveQuery(
    videoByIdQuery(Number(videoId)),
    NOPQueryMapper
  );

  const isError = error !== undefined;
  const video = data?.[0] ?? null;
  const isNotFound = !isLoading && !isError && video === null;

  useEffect(() => {
    if (isLoading || isError || !video) return;

    const path = buildFullPath(video.relative_path);
    player.replace(path);
  }, [isLoading, isError, video?.id, video?.relative_path, player]);

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

  if (isNotFound) {
    return (
      <View>
        <Text className="text-foreground">Video not found</Text>
      </View>
    );
  }

  return (
    <View>
      <VideoView
        className="aspect-video w-full"
        player={player}
        fullscreenOptions={{ enable: true }}
        allowsPictureInPicture
      />
    </View>
  );
}
