import { View, Text, FlatList } from "react-native";
import { useVideoPlayerContext } from "../contexts/video-screen-context";
import { File } from 'expo-file-system';
import { useEffect, useRef, useState } from "react";
import { parseSubtitles, SubtitleCue } from "@/utils/subtitles";
import Subtitle from "./subtitle";
import { useEventListener } from "expo";

export default function SubtitlesPlayer() {
  const { player, subtitlesUri } = useVideoPlayerContext();

  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const subtitleListRef = useRef<FlatList<SubtitleCue> | null>(null);

  const [activeSubtitleIndex, setActiveSubtitleIndex] = useState<number>(-1);

  async function readFile() {
    const file = new File(subtitlesUri!);
    return await file.text();
  };

  useEffect(() => {
    const loadSubtitles = async () => {
      const input = await readFile();
      const parsed = parseSubtitles(input);
      setSubtitles(parsed);
    };

    loadSubtitles();
  }, [subtitlesUri]);

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
  if (subtitlesUri == null) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-2">
        <Text className="text-foreground">There was an error reading your file</Text>
      </View>
    );
  }

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
