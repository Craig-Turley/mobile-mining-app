import YoutubePlayer from "react-native-youtube-iframe";
import { VideoView } from 'expo-video';
import { cssInterop } from 'nativewind';
import { View, Text } from 'react-native';
import { useEffect } from 'react';
import { buildFullPath } from '@/lib/file-system';
import { useAppLiveQuery } from '@/db/hooks/use-app-live-query';
import { videoByIdQuery } from '@/db/features/files/files.queries';
import { NOPQueryMapper } from '@/db/hooks/use-query';
import { useLocalVideoPlayerContext, useVideoPlayerContext, useYoutubeVideoPlayerContext } from '../contexts/video-screen-context';

cssInterop(VideoView, {
  className: 'style',
});

export default function VideoPlayer() {
  const context = useVideoPlayerContext();

  switch (context.type) {
    case "local":
      return <LocalVideoPlayer />;
    case "youtube":
      return <YoutubeVideoPlayer />;
  }
}

function LocalVideoPlayer() {
  const { player, source } = useLocalVideoPlayerContext();

  const { data, error, isLoading } = useAppLiveQuery(
    videoByIdQuery(Number(source.videoId)),
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

function YoutubeVideoPlayer() {
  const {
    player,
    source,
    playing,
    onChangeState,
  } = useYoutubeVideoPlayerContext();

  return (
    <YoutubePlayer
      ref={player}
      height={220}
      videoId={source.url}
      play={playing}
      onChangeState={onChangeState}
    />
  );
}
