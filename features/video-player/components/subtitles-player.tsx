import Subtitle from './subtitle';
import { View, Text, FlatList, Pressable } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { parseSubtitles, parseYoutubeSubtitles, SubtitleCue } from '@/lib/subtitles';
import { useEventListener } from 'expo';
import { getFile, openFile } from '@/lib/file-system';
import { insertSubtitle } from '@/db/features/files/files.services';
import { useAppLiveQuery } from '@/db/hooks/use-app-live-query';
import { subtitleByIdQuery, videoByIdQuery } from '@/db/features/files/files.queries';
import {
  useLocalVideoPlayerContext,
  useVideoPlayerContext,
  useYoutubeVideoPlayerContext,
} from '../contexts/video-screen-context';
import { YoutubeCaptions } from '@/lib/youtube-webview';
import { useSubtitlePlayerContext } from '../contexts/subtitles-context';

type SubtitleError = 'unassociated_file' | 'upload_error' | 'missing_file';

export default function SubtitlesPlayer() {
  const { source } = useVideoPlayerContext();

  switch (source.type) {
    case 'local':
      return <LocalSubtitlesPlayer />;
    case 'youtube':
      return <YoutubeSubtitlesPlayer />;
  }
}

export function LocalSubtitlesPlayer() {
  const { player, source } = useLocalVideoPlayerContext();

  const {
    subtitles,
    activeSubtitleIndex,
    setSubtitles,
    setActiveSubtitleIndex,
  } = useSubtitlePlayerContext();

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

  const subtitleListRef = useRef<FlatList<SubtitleCue> | null>(null);
  const subtitlesRef = useRef<SubtitleCue[]>([]);

  useEffect(() => {
    subtitlesRef.current = subtitles;
  }, [subtitles]);

  const uploadSubtitle = async () => {
    const file = await getFile({ src: 'file' });

    if (file === undefined) return;

    try {
      setError(null);
      await insertSubtitle(videoId, file);
    } catch {
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
    setSubtitles,
    setActiveSubtitleIndex,
  ]);

  useEventListener(player, 'timeUpdate', (event) => {
    const currentTime = event.currentTime;
    const currentSubtitles = subtitlesRef.current;

    setActiveSubtitleIndex((previousIndex) => {
      const nextIndex = currentSubtitles.findIndex(
        (cue) => cue.start <= currentTime && currentTime <= cue.end,
      );

      if (nextIndex === -1 || nextIndex === previousIndex) {
        return previousIndex;
      }

      return nextIndex;
    });
  });

  useEffect(() => {
    if (activeSubtitleIndex < 0) return;

    subtitleListRef.current?.scrollToIndex({
      index: activeSubtitleIndex,
      animated: true,
      viewPosition: 0,
    });
  }, [activeSubtitleIndex]);

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
            className="rounded-lg bg-primary px-6 py-3 active:opacity-80"
          >
            <Text className="text-center text-base font-semibold text-foreground">
              Upload
            </Text>
          </Pressable>
        </View>
      );

    case 'missing_file':
      return (
        <View className="flex-1 items-center justify-center bg-background p-2">
          <Text className="text-foreground">
            There was an error retrieving the file.
          </Text>
        </View>
      );

    case 'upload_error':
      return (
        <View className="flex-1 items-center justify-center bg-background p-2">
          <Text className="text-foreground">
            There was an error uploading the file.
          </Text>
        </View>
      );
  }

  return (
    <SubtitleList
      listRef={subtitleListRef}
      keyPrefix={`${subtitleId}`}
    />
  );
}

function YoutubeSubtitlesPlayer() {
  const { player, getTimestamp, source } =
    useYoutubeVideoPlayerContext();

  const {
    subtitles,
    activeSubtitleIndex,
    setSubtitles,
    setActiveSubtitleIndex,
  } = useSubtitlePlayerContext();

  const captions = useMemo(
    () => JSON.parse(source.captions) as YoutubeCaptions,
    [source.captions],
  );

  const parsedSubtitles = useMemo(
    () => parseYoutubeSubtitles(captions.captions),
    [captions],
  );

  const subtitleListRef = useRef<FlatList<SubtitleCue> | null>(null);
  const subtitlesRef = useRef<SubtitleCue[]>([]);

  useEffect(() => {
    subtitlesRef.current = subtitles;
  }, [subtitles]);

  useEffect(() => {
    setSubtitles(parsedSubtitles);
    setActiveSubtitleIndex(-1);

    return () => {
      setSubtitles([]);
      setActiveSubtitleIndex(-1);
    };
  }, [
    parsedSubtitles,
    setSubtitles,
    setActiveSubtitleIndex,
  ]);

  useEffect(() => {
    let cancelled = false;

    const updateActiveSubtitle = async () => {
      const currentTime = await getTimestamp();

      if (cancelled) return;

      const currentSubtitles = subtitlesRef.current;

      setActiveSubtitleIndex((previousIndex) => {
        const nextIndex = currentSubtitles.findIndex(
          (cue) => cue.start <= currentTime && currentTime <= cue.end,
        );

        if (nextIndex === -1 || nextIndex === previousIndex) {
          return previousIndex;
        }

        return nextIndex;
      });
    };

    const interval = setInterval(() => {
      void updateActiveSubtitle();
    }, 250);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [player, getTimestamp, setActiveSubtitleIndex]);

  useEffect(() => {
    if (activeSubtitleIndex < 0) return;

    subtitleListRef.current?.scrollToIndex({
      index: activeSubtitleIndex,
      animated: true,
      viewPosition: 0,
    });
  }, [activeSubtitleIndex]);

  return (
    <SubtitleList
      listRef={subtitleListRef}
      keyPrefix={`${source.videoId}`}
    />
  );
}

type SubtitleListProps = {
  listRef: React.RefObject<FlatList<SubtitleCue> | null>;
  keyPrefix: string;
};

function SubtitleList({
  listRef,
  keyPrefix,
}: SubtitleListProps) {
  const {
    subtitles,
    activeSubtitleIndex,
  } = useSubtitlePlayerContext();

  return (
    <View className="flex-1 bg-background p-2">
      <FlatList
        ref={listRef}
        data={subtitles}
        extraData={activeSubtitleIndex}
        keyExtractor={(item) => `${keyPrefix}-${item.id}`}
        renderItem={({ item, index }) => (
          <Subtitle
            cue={item}
            active={activeSubtitleIndex === index}
          />
        )}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: true,
          });

          setTimeout(() => {
            listRef.current?.scrollToIndex({
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
