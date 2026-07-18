import { View, Text, FlatList, Button, Pressable } from 'react-native';
import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { parseSubtitles, SubtitleCue } from '@/utils/subtitles';
import Subtitle from './subtitle';
import { useEventListener } from 'expo';
import { VideoPlayer } from 'expo-video';
import { Directory, File, Paths } from 'expo-file-system';
import getFile from '@/utils/file';
import { useInsertSubtitle, useSubtitleData } from '@/lib/file-db-hooks';

export interface SubtitlePlayerProps extends PropsWithChildren {
  videoId: number;
  subtitlesId: number | null;
  player: VideoPlayer;
}

type SubtitleError = 'unassociated_file' | 'upload_error' | 'missing_file';

export default function SubtitlesPlayer({ videoId, subtitlesId, player }: SubtitlePlayerProps) {
  const insertSubtitle = useInsertSubtitle();

  const {
    data,
    error: subtitleQueryError,
    isLoading: isSubtitleLoading,
  } = useSubtitleData(subtitlesId);
  const subtitleFile = data?.[0] ?? null;

  const [error, setError] = useState<SubtitleError | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const [activeSubtitleIndex, setActiveSubtitleIndex] = useState<number>(-1);

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

      if (subtitlesId == null) {
        setError('unassociated_file');
        return;
      }

      if (subtitleQueryError) {
        setError('missing_file');
        return;
      }

      if (data === undefined) {
        return;
      }

      if (!subtitleFile) {
        setError('unassociated_file');
        return;
      }

      const dir = new Directory(Paths.document);

      if (!dir.exists) {
        setError('missing_file');
        return;
      }

      try {
        const file = new File(Paths.document, subtitleFile.relative_path);
        const text = await file.text();
        const parsed = parseSubtitles(text);

        if (cancelled) return;

        setError(null);
        setSubtitles(parsed);
        setActiveSubtitleIndex(-1);
      } catch (e) {
        if (cancelled) return;
        setError('missing_file');
      }
    };

    loadSubtitles();

    return () => {
      cancelled = true;
    };
  }, [subtitlesId, data, subtitleFile?.id, subtitleFile?.relative_path, subtitleQueryError]);

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
            keyExtractor={(item) => `${subtitlesId}-${item.id}`}
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
