import Subtitle from './subtitle';
import { View, Text, FlatList, Pressable } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { parseSubtitles, SubtitleCue } from '@/lib/subtitles';
import { useEventListener } from 'expo';
import { getFile, openFile } from '@/lib/file-system';
import { insertSubtitle } from '@/db/features/files/files.services';
import { useAppLiveQuery } from '@/db/hooks/use-app-live-query';
import { subtitleByIdQuery, videoByIdQuery } from '@/db/features/files/files.queries';
import { useLocalVideoPlayerContext, useVideoPlayerContext } from '../contexts/video-screen-context';

type SubtitleError = 'unassociated_file' | 'upload_error' | 'missing_file';

export default function SubtitlesPlayer() {
  const { source } = useVideoPlayerContext();

  switch (source.type) {
    case "local":
      return <LocalSubtitlesPlayer />
    case "youtube":
      return <YoutubeSubtitlesPlayer />
  }
}

export function LocalSubtitlesPlayer() {
  const { player, source } = useLocalVideoPlayerContext();

  const videoId = Number(source.videoId);
  const {
    data: videoData,
    error: videoError,
    isLoading: isVideoLoading,
  } = useAppLiveQuery(
    videoByIdQuery(videoId),
    (rows) => rows[0] ?? null,
    [videoId],
  );

  const subtitleId = videoData?.subtitle_id ?? null;
  const {
    data: subtitleFile,
    error: subtitleQueryError,
    isLoading: isSubtitleLoading,
  } = useAppLiveQuery(
    subtitleByIdQuery(subtitleId),
    (rows) => rows[0],
    [subtitleId],
  );

  const [error, setError] = useState<SubtitleError | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const [activeSubtitleIndex, setActiveSubtitleIndex] = useState(-1);

  const subtitleListRef = useRef<FlatList<SubtitleCue> | null>(null);
  const subtitlesRef = useRef<SubtitleCue[]>([]);

  useEffect(() => {
    subtitlesRef.current = subtitles;
  }, [subtitles]);

  const uploadSubtitle = async () => {
    const file = await getFile({ src: 'file' });
    if (file == undefined) return;

    try {
      setError(null);
      await insertSubtitle(videoId, file);
    } catch (e) {
      setError('upload_error');
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadSubtitles = async () => {
      setError(null);
      setSubtitles([]);
      setActiveSubtitleIndex(-1);

      if (subtitleId == null) {
        setError('unassociated_file');
        return;
      }

      if (subtitleQueryError) {
        setError('missing_file');
        return;
      }

      if (subtitleFile == null) {
        return;
      }

      try {
        const file = await openFile(subtitleFile.relative_path);
        const parsed = parseSubtitles(file);

        if (cancelled) return;

        setSubtitles(parsed);
      } catch {
        if (cancelled) return;

        setError('missing_file');
      }
    };

    void loadSubtitles();

    return () => {
      cancelled = true;
    };
  }, [
    subtitleId,
    subtitleFile?.id,
    subtitleFile?.relative_path,
    subtitleQueryError,
  ]);

  useEffect(() => {
    if (activeSubtitleIndex < 0) return;

    subtitleListRef.current?.scrollToIndex({
      index: activeSubtitleIndex,
      animated: true,
      viewPosition: 0,
    });
  }, [activeSubtitleIndex]);

  useEventListener(player, 'timeUpdate', (event) => {
    const currentTime = event.currentTime;
    const currentSubtitles = subtitlesRef.current;

    setActiveSubtitleIndex((prev) => {
      const next = currentSubtitles.findIndex(
        (cue) => cue.start <= currentTime && currentTime <= cue.end
      );

      if (next === -1 || next === prev) return prev;

      return next;
    });
  });

  if (isSubtitleLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-2">
        <Text className="text-foreground">Loading subtitles...</Text>
      </View>
    );
  }

  if (isVideoLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-2">
        <Text className="text-foreground">Loading video...</Text>
      </View>
    );
  }

  if (videoError) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-2">
        <Text className="text-foreground">
          There was an error retrieving the video.
        </Text>
      </View>
    );
  }

  if (isSubtitleLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-2">
        <Text className="text-foreground">Loading subtitles...</Text>
      </View>
    );
  }

  switch (error) {
    case 'unassociated_file':
      return (
        <View className="flex-1 flex-col items-center justify-center gap-6 bg-background p-2">
          <Text className="p-3 text-center text-2xl text-foreground">
            No subtitle file is associated with this video.
          </Text>

          <Pressable
            onPress={uploadSubtitle}
            className="rounded-lg bg-primary px-6 py-3 active:opacity-80">
            <Text className="text-center text-base font-semibold text-foreground">Upload</Text>
          </Pressable>
        </View>
      );

    case 'missing_file':
      return (
        <View className="flex-1 items-center justify-center bg-background p-2">
          <Text className="text-foreground">There was an error retrieving the file.</Text>
        </View>
      );

    case 'upload_error':
      return (
        <View className="flex-1 items-center justify-center bg-background p-2">
          <Text className="text-foreground">There was an error uploading the file.</Text>
        </View>
      );

    default:
      return (
        <View className="flex-1 bg-background p-2">
          <FlatList
            ref={subtitleListRef}
            data={subtitles}
            extraData={activeSubtitleIndex}
            keyExtractor={(item) => `${subtitleId}-${item.id}`}
            renderItem={({ item, index }) => (
              <Subtitle
                cue={item}
                active={activeSubtitleIndex !== -1 && activeSubtitleIndex === index}
              />
            )}
            onScrollToIndexFailed={(info) => {
              subtitleListRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: true,
              });

              setTimeout(() => {
                subtitleListRef.current?.scrollToIndex({
                  index: info.index,
                  animated: true,
                  viewPosition: 0,
                });
              }, 250);
            }}
          />
        </View>
      );
  }
}

function YoutubeSubtitlesPlayer() {
  return (<View></View>)
}
