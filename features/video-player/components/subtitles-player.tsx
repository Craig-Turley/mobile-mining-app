import { View, Text, FlatList, Button } from "react-native";
import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { parseSubtitles, SubtitleCue } from "@/utils/subtitles";
import Subtitle from "./subtitle";
import { useEventListener } from "expo";
import { VideoPlayer } from "expo-video";
import { useFileDb } from "@/contexts/file-sqlite";
import { Directory, File, Paths } from "expo-file-system";
import getFile from "@/utils/file";

export interface SubtitlePlayerProps extends PropsWithChildren {
  videoId: number;
  subtitlesId: number,
  player: VideoPlayer,
}

type SubtitleError = "unassociated_file" | "upload_error" | "missing_file";

export default function SubtitlesPlayer({ videoId, subtitlesId, player }: SubtitlePlayerProps) {
  const { getSubtitleData, insertSubtitle } = useFileDb();

  const [error, setError] = useState<SubtitleError | null>(null);

  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const subtitleListRef = useRef<FlatList<SubtitleCue> | null>(null);

  const [activeSubtitleIndex, setActiveSubtitleIndex] = useState<number>(-1);

  const uploadSubtitle = async () => {
    const file = await getFile({ src: "file" });
    if (file == undefined) return;
    try {
      console.log("inserting file", videoId, file.uri);
      insertSubtitle(videoId, file);
      return;
    } catch (e) {
      setError("upload_error");
      return;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadSubtitles = async () => {
      console.log("getting for", subtitlesId);

      setError(null);
      setSubtitles([]);
      setActiveSubtitleIndex(-1);

      const fileInformation = await getSubtitleData(subtitlesId);

      if (cancelled) return;

      if (fileInformation == null) {
        setError("unassociated_file");
        return;
      }

      const dir = new Directory(Paths.document);

      if (!dir.exists) {
        setError("missing_file");
        return;
      }

      const file = new File(Paths.document, fileInformation.relative_path);
      const text = await file.text();
      const parsed = parseSubtitles(text);

      if (cancelled) return;

      setError(null);
      setSubtitles(parsed);
      setActiveSubtitleIndex(-1);
    };

    loadSubtitles();

    return () => {
      cancelled = true;
    };
  }, [subtitlesId]);

  useEffect(() => {
    if (activeSubtitleIndex < 0) return;

    subtitleListRef.current?.scrollToIndex({
      index: activeSubtitleIndex,
      animated: true,
      viewPosition: 0,
    });
  }, [activeSubtitleIndex]);

  useEventListener(player, 'timeUpdate', event => {
    const currentTime = event.currentTime;

    setActiveSubtitleIndex(prev => {
      const next = subtitles.findIndex(
        cue => cue.start <= currentTime && currentTime <= cue.end
      );

      if (next === -1 || next === prev) return prev;

      return next;
    });
  });

  // TODO: style this
  switch (error) {
    case "unassociated_file":
      return (
        <View className="flex-1 flex-col gap-2 items-center justify-center bg-background p-2">
          <Text className="text-foreground text-2xl">
            No subtitle file is associated with this video.
          </Text>
          <Button
            title="Upload"
            onPress={uploadSubtitle}
          />
        </View>
      );

    case "missing_file":
      return (
        <View className="flex-1 items-center justify-center bg-background p-2">
          <Text className="text-foreground">
            There was an error retrieving the file.
          </Text>
        </View>
      );

    case "upload_error":
      return (
        <View className="flex-1 items-center justify-center bg-background p-2">
          <Text className="text-foreground">
            There was an error uploading the file.
          </Text>
        </View>
      );

    default:
      return (
        <View className="flex-1 bg-background p-2">
          <FlatList
            ref={subtitleListRef}
            data={subtitles}
            keyExtractor={(item) => `${item.id}`}
            renderItem={({ item, index }) => (
              <Subtitle cue={item} active={activeSubtitleIndex != -1 && activeSubtitleIndex == index} />
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
