import { View, Text, ScrollView } from "react-native";
import { useVideoPlayerContext } from "../contexts/video-screen-context";
import { File } from 'expo-file-system';
import { useEffect, useMemo, useRef, useState } from "react";
import { parseSubtitles, SubtitleCue } from "@/utils/subtitles";
import Subtitle from "./subtitle";

// TODO: remove
const fallbackSubtitle: SubtitleCue = {
  id: -1,
  start: 0,
  end: 0,
  text: "",
};

export default function SubtitlesPlayer() {
  const { subtitlesUri, timeStamp } = useVideoPlayerContext();
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const itemPositions = useRef<Record<number, number>>({});

  // TODO: relook at this
  const activeSubtitle = useMemo<SubtitleCue>(() => {
    let previous: SubtitleCue | undefined;

    for (const subtitle of subtitles) {
      if (timeStamp >= subtitle.start && timeStamp <= subtitle.end) {
        return subtitle;
      }

      if (subtitle.end < timeStamp) {
        previous = subtitle;
      }

      if (subtitle.start > timeStamp) {
        break;
      }
    }

    return previous ?? subtitles[0] ?? fallbackSubtitle;
  }, [subtitles, timeStamp]);

  const activeIndex = useMemo(() => {
    return subtitles.findIndex((cue) => cue.id === activeSubtitle.id);
  }, [subtitles, activeSubtitle]);

  useEffect(() => {
    if (activeIndex < 0) return;

    const y = itemPositions.current[activeIndex];

    if (y == null) return;

    scrollViewRef.current?.scrollTo({
      y: Math.max(y - 120, 0),
      animated: true,
    });
  }, [activeIndex]);

  useEffect(() => {
    const loadSubtitles = async () => {
      const input = await readFile();
      const parsed = parseSubtitles(input);
      setSubtitles(parsed);
    };

    loadSubtitles();
  }, [subtitlesUri]);

  // TODO: style this
  if (subtitlesUri == null) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-2">
        <Text className="text-foreground">There was an error reading your file</Text>
      </View>
    );
  }

  async function readFile() {
    const file = new File(subtitlesUri!);
    return await file.text();
  };

  return (
    <View className="flex-1 items-center justify-center bg-background p-2">
      <ScrollView className="w-full" ref={scrollViewRef}>
        {subtitles.map((cue, index) => (
          <Subtitle
            key={cue.id}
            cue={cue}
            onLayout={(event) => {
              itemPositions.current[index] = event.nativeEvent.layout.y;
            }}
          />
        ))}
      </ScrollView>
    </View>
  );
}
